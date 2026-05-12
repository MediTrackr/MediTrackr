-- Migration 11: Reconciliation Trigger
-- Auto-populates shadow_ledger when a RAMQ claim is marked paid or partial.
-- Also creates a helper function for manual reconciliation runs.

-- =====================================================
-- 1. POPULATE SHADOW LEDGER ON CLAIM PAYMENT
-- Fires on UPDATE when status changes to 'paid' or 'partial'.
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_shadow_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_variance  NUMERIC(10,2);
  v_pct       NUMERIC(5,2);
BEGIN
  -- Only act when status moves to paid or partial
  IF NEW.status NOT IN ('paid', 'partial') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_variance := COALESCE(NEW.amount_received, 0) - NEW.total_claimed;
  v_pct := CASE
    WHEN NEW.total_claimed > 0
    THEN ROUND((v_variance / NEW.total_claimed) * 100, 2)
    ELSE 0
  END;

  -- Upsert: one shadow_ledger row per claim (idempotent on re-runs)
  INSERT INTO public.shadow_ledger (
    user_id,
    claim_id,
    payment_source,
    expected_amount,
    expected_date,
    actual_amount,
    actual_date,
    variance_amount,
    variance_percentage,
    discrepancy_reason,
    resolved,
    calculation_basis
  )
  VALUES (
    NEW.user_id,
    NEW.id,
    'RAMQ',
    NEW.total_claimed,
    COALESCE(NEW.submitted_at::date, CURRENT_DATE),
    COALESCE(NEW.amount_received, 0),
    CURRENT_DATE,
    v_variance,
    v_pct,
    CASE
      WHEN NEW.status = 'partial'       THEN 'Paiement partiel — montant inférieur au réclamé'
      WHEN v_variance < 0               THEN 'Paiement inférieur au montant réclamé'
      WHEN v_variance > 0               THEN 'Paiement supérieur au montant réclamé'
      ELSE NULL
    END,
    v_variance = 0,   -- auto-resolve when exact match
    jsonb_build_object(
      'claim_number',  NEW.claim_number,
      'patient_name',  NEW.patient_name,
      'service_date',  NEW.service_date,
      'status',        NEW.status
    )
  )
  ON CONFLICT (claim_id) DO UPDATE SET
    actual_amount        = EXCLUDED.actual_amount,
    actual_date          = EXCLUDED.actual_date,
    variance_amount      = EXCLUDED.variance_amount,
    variance_percentage  = EXCLUDED.variance_percentage,
    discrepancy_reason   = EXCLUDED.discrepancy_reason,
    resolved             = EXCLUDED.resolved,
    updated_at           = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unique constraint so ON CONFLICT works
ALTER TABLE public.shadow_ledger
  ADD CONSTRAINT IF NOT EXISTS shadow_ledger_claim_id_unique UNIQUE (claim_id);

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_sync_shadow_ledger ON public.ramq_claims;

CREATE TRIGGER trg_sync_shadow_ledger
  AFTER UPDATE ON public.ramq_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shadow_ledger();

-- =====================================================
-- 2. BACKFILL EXISTING PAID / PARTIAL CLAIMS
-- One-time pass to populate shadow_ledger from history.
-- =====================================================
INSERT INTO public.shadow_ledger (
  user_id, claim_id, payment_source,
  expected_amount, expected_date,
  actual_amount, actual_date,
  variance_amount, variance_percentage,
  discrepancy_reason, resolved, calculation_basis
)
SELECT
  user_id,
  id                                                              AS claim_id,
  'RAMQ'                                                         AS payment_source,
  total_claimed                                                  AS expected_amount,
  COALESCE(submitted_at::date, created_at::date)                AS expected_date,
  COALESCE(amount_received, 0)                                   AS actual_amount,
  CURRENT_DATE                                                   AS actual_date,
  COALESCE(amount_received, 0) - total_claimed                  AS variance_amount,
  CASE WHEN total_claimed > 0
    THEN ROUND(((COALESCE(amount_received,0) - total_claimed) / total_claimed) * 100, 2)
    ELSE 0 END                                                   AS variance_percentage,
  CASE
    WHEN status = 'partial'                             THEN 'Paiement partiel — montant inférieur au réclamé'
    WHEN COALESCE(amount_received,0) < total_claimed   THEN 'Paiement inférieur au montant réclamé'
    WHEN COALESCE(amount_received,0) > total_claimed   THEN 'Paiement supérieur au montant réclamé'
    ELSE NULL
  END                                                            AS discrepancy_reason,
  (COALESCE(amount_received, 0) = total_claimed)                AS resolved,
  jsonb_build_object(
    'claim_number', claim_number,
    'patient_name', patient_name,
    'service_date', service_date,
    'status',       status
  )                                                              AS calculation_basis
FROM public.ramq_claims
WHERE status IN ('paid', 'partial')
ON CONFLICT (claim_id) DO NOTHING;
