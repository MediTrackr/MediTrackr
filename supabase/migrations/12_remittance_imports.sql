-- Migration 12: Remittance Imports
-- Stores parsed RAMQ remittance reports and the extracted claim lines.

-- =====================================================
-- 1. REMITTANCE_IMPORTS
-- One row per uploaded remittance report (PDF / image).
-- =====================================================
CREATE TABLE IF NOT EXISTS public.remittance_imports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type      TEXT NOT NULL DEFAULT 'RAMQ_REMITTANCE',
  source           TEXT DEFAULT 'upload',       -- 'upload' | 'fax' | 'email'
  file_name        TEXT,
  payment_date     DATE,
  batch_number     TEXT,
  total_approved   NUMERIC(12, 2),
  total_withheld   NUMERIC(12, 2),
  net_payment      NUMERIC(12, 2),
  raw_extract      JSONB,                        -- full Claude JSON response
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'applied', 'partial', 'rejected')),
  applied_count    INTEGER DEFAULT 0,
  unmatched_count  INTEGER DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remittance_imports_user_id ON public.remittance_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_remittance_imports_payment_date ON public.remittance_imports(payment_date);

ALTER TABLE public.remittance_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own remittance imports"
  ON public.remittance_imports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. REMITTANCE_LINES
-- Individual claim-level lines extracted from the report.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.remittance_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id        UUID NOT NULL REFERENCES public.remittance_imports(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_number     TEXT,
  matched_claim_id UUID REFERENCES public.ramq_claims(id) ON DELETE SET NULL,
  patient_ramq     TEXT,
  service_date     DATE,
  act_code         TEXT,
  amount_claimed   NUMERIC(10, 2),
  amount_approved  NUMERIC(10, 2),
  amount_withheld  NUMERIC(10, 2),
  reduction_code   TEXT,
  reduction_reason TEXT,
  applied          BOOLEAN DEFAULT FALSE,
  applied_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remittance_lines_import_id  ON public.remittance_lines(import_id);
CREATE INDEX IF NOT EXISTS idx_remittance_lines_claim_id   ON public.remittance_lines(matched_claim_id);
CREATE INDEX IF NOT EXISTS idx_remittance_lines_user_id    ON public.remittance_lines(user_id);

ALTER TABLE public.remittance_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own remittance lines"
  ON public.remittance_lines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
