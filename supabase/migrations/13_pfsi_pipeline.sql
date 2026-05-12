-- Migration 13: PFSI Full Pipeline
-- Dedicated pfsi_claims table, shadow_ledger extension for PFSI,
-- and migration of legacy invoices PFSI data.

-- =====================================================
-- 1. PFSI_CLAIMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pfsi_claims (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Patient
  patient_name          TEXT NOT NULL,
  client_id             TEXT,                 -- IFHP / PFSI client ID
  patient_dob           DATE,

  -- Claim metadata
  claim_number          TEXT,
  invoice_number        TEXT,
  approval_type         TEXT DEFAULT 'post'   -- 'prior' | 'post'
                        CHECK (approval_type IN ('prior', 'post')),
  specialty             TEXT,
  referring_prescriber  TEXT,

  -- Service lines (JSONB array)
  service_lines         JSONB DEFAULT '[]'::JSONB,

  -- Financials
  total_claimed         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_received       NUMERIC(12, 2),

  -- Status pipeline
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'submitted', 'approved',
                          'rejected', 'paid', 'partial', 'review_needed'
                        )),

  -- Outcome details
  rejection_reason      TEXT,
  rejection_code        TEXT,
  additional_info       TEXT,

  -- Timestamps
  submitted_at          TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pfsi_claims_user_id    ON public.pfsi_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_pfsi_claims_status     ON public.pfsi_claims(status);
CREATE INDEX IF NOT EXISTS idx_pfsi_claims_client_id  ON public.pfsi_claims(client_id);

ALTER TABLE public.pfsi_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PFSI claims"
  ON public.pfsi_claims FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. EXTEND SHADOW_LEDGER FOR PFSI
-- Add source_type so we can distinguish RAMQ vs PFSI entries.
-- =====================================================
ALTER TABLE public.shadow_ledger
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'RAMQ'
  CHECK (source_type IN ('RAMQ', 'PFSI', 'FEDERAL', 'OUT_OF_PROVINCE', 'OTHER'));

ALTER TABLE public.shadow_ledger
  ADD COLUMN IF NOT EXISTS pfsi_claim_id UUID REFERENCES public.pfsi_claims(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shadow_ledger_pfsi_claim_id ON public.shadow_ledger(pfsi_claim_id);

-- Unique constraint for PFSI entries (parallel to claim_id for RAMQ)
ALTER TABLE public.shadow_ledger
  ADD CONSTRAINT IF NOT EXISTS shadow_ledger_pfsi_claim_id_unique UNIQUE (pfsi_claim_id);

-- =====================================================
-- 3. PFSI SHADOW LEDGER TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_pfsi_shadow_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_variance  NUMERIC(10,2);
  v_pct       NUMERIC(5,2);
BEGIN
  IF NEW.status NOT IN ('paid', 'partial') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_variance := COALESCE(NEW.amount_received, 0) - NEW.total_claimed;
  v_pct := CASE WHEN NEW.total_claimed > 0
    THEN ROUND((v_variance / NEW.total_claimed) * 100, 2)
    ELSE 0 END;

  INSERT INTO public.shadow_ledger (
    user_id, pfsi_claim_id, source_type, payment_source,
    expected_amount, expected_date,
    actual_amount, actual_date,
    variance_amount, variance_percentage,
    discrepancy_reason, resolved, calculation_basis
  )
  VALUES (
    NEW.user_id, NEW.id, 'PFSI', 'Medavie Blue Cross',
    NEW.total_claimed,
    COALESCE(NEW.submitted_at::date, CURRENT_DATE),
    COALESCE(NEW.amount_received, 0),
    CURRENT_DATE,
    v_variance, v_pct,
    CASE
      WHEN NEW.status = 'partial' THEN 'Paiement partiel PFSI — montant inférieur au réclamé'
      WHEN v_variance < 0         THEN 'Paiement inférieur au montant réclamé'
      WHEN v_variance > 0         THEN 'Paiement supérieur au montant réclamé'
      ELSE NULL
    END,
    v_variance = 0,
    jsonb_build_object(
      'claim_number',  NEW.claim_number,
      'patient_name',  NEW.patient_name,
      'client_id',     NEW.client_id,
      'source_type',   'PFSI',
      'status',        NEW.status
    )
  )
  ON CONFLICT (pfsi_claim_id) DO UPDATE SET
    actual_amount       = EXCLUDED.actual_amount,
    actual_date         = EXCLUDED.actual_date,
    variance_amount     = EXCLUDED.variance_amount,
    variance_percentage = EXCLUDED.variance_percentage,
    discrepancy_reason  = EXCLUDED.discrepancy_reason,
    resolved            = EXCLUDED.resolved,
    updated_at          = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_pfsi_shadow_ledger ON public.pfsi_claims;
CREATE TRIGGER trg_sync_pfsi_shadow_ledger
  AFTER UPDATE ON public.pfsi_claims
  FOR EACH ROW EXECUTE FUNCTION public.sync_pfsi_shadow_ledger();

-- =====================================================
-- 4. MIGRATE LEGACY PFSI DATA FROM INVOICES
-- Copies existing PFSI entries into the new table.
-- Reads the stored JSON blob from notes column.
-- =====================================================
INSERT INTO public.pfsi_claims (
  user_id, patient_name, client_id, patient_dob,
  invoice_number, approval_type, specialty, referring_prescriber,
  service_lines, total_claimed, amount_received,
  status, additional_info, created_at, updated_at
)
SELECT
  COALESCE(user_id, doctor_id)                                  AS user_id,
  COALESCE(patient_name, 'Inconnu')                             AS patient_name,
  COALESCE(patient_ramq, patient_id)                            AS client_id,
  CASE WHEN patient_dob ~ '^\d{4}-\d{2}-\d{2}$'
    THEN patient_dob::DATE ELSE NULL END                        AS patient_dob,
  invoice_number,
  COALESCE((notes::JSONB ->> 'approval_type'), 'post')          AS approval_type,
  (notes::JSONB ->> 'specialty')                                AS specialty,
  (notes::JSONB ->> 'referring_prescriber')                     AS referring_prescriber,
  COALESCE((notes::JSONB -> 'lines'), '[]'::JSONB)              AS service_lines,
  COALESCE(total_amount, amount, 0)                             AS total_claimed,
  amount_paid                                                   AS amount_received,
  CASE status
    WHEN 'pending'   THEN 'submitted'
    WHEN 'overdue'   THEN 'review_needed'
    ELSE COALESCE(status, 'draft')
  END                                                           AS status,
  (notes::JSONB ->> 'additional_info')                          AS additional_info,
  created_at, updated_at
FROM public.invoices
WHERE partner_type = 'pfsi'
  AND (notes IS NULL OR notes ~ '^\{')   -- valid JSON or no notes
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. PFSI BILLING SUMMARY VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.pfsi_billing_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE status = 'draft')                                      AS draft_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'draft'), 0)               AS draft_amount,
  COUNT(*) FILTER (WHERE status IN ('submitted', 'approved'))                    AS pending_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status IN ('submitted','approved')), 0) AS pending_amount,
  COUNT(*) FILTER (WHERE status = 'paid'
    AND (amount_received IS NULL OR amount_received >= total_claimed * 0.99))    AS paid_count,
  COALESCE(SUM(amount_received) FILTER (WHERE status = 'paid'
    AND (amount_received IS NULL OR amount_received >= total_claimed * 0.99)), 0) AS paid_amount,
  COUNT(*) FILTER (WHERE status = 'partial'
    OR (status='paid' AND amount_received IS NOT NULL AND amount_received < total_claimed*0.99)) AS partial_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'partial'
    OR (status='paid' AND amount_received IS NOT NULL AND amount_received < total_claimed*0.99)), 0) AS partial_amount,
  COUNT(*) FILTER (WHERE status = 'rejected')                                    AS rejected_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'rejected'), 0)             AS rejected_amount,
  COUNT(*) FILTER (WHERE status = 'review_needed')                               AS review_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'review_needed'), 0)        AS review_amount,
  COUNT(*)                                                                        AS total_count,
  COALESCE(SUM(total_claimed), 0)                                                 AS total_claimed,
  COALESCE(SUM(COALESCE(amount_received, 0)), 0)                                  AS total_received,
  COALESCE(SUM(total_claimed) - SUM(COALESCE(amount_received, 0)), 0)             AS total_outstanding
FROM public.pfsi_claims
GROUP BY user_id;
