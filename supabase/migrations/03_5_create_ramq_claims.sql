-- Migration 03.5: Create ramq_claims and ramq_claims_archive tables
-- Must run AFTER 03_create_expenses.sql and BEFORE 04_ramq_validations.sql
-- Migration 04 ALTERs ramq_claims — this migration creates it.

-- =====================================================
-- 1. RAMQ_CLAIMS (primary claim table)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ramq_claims (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Patient info
  patient_name         TEXT NOT NULL,
  patient_ramq         TEXT NOT NULL,
  patient_dob          DATE,

  -- Provider info
  doctor_ramq          TEXT,
  professional_category TEXT,
  role                 TEXT,

  -- Service details
  service_date         DATE NOT NULL,
  start_time           TIME,
  end_time             TIME,
  location_code        TEXT REFERENCES public.localities(locality_code),
  act_codes            JSONB,
  context_elements     TEXT[],
  territory_premium    NUMERIC(10, 2),

  -- Diagnostic
  diagnostic_code      TEXT,
  diagnostic_desc      TEXT,
  lmp_date             DATE,

  -- Pediatric (auto-set by trigger in migration 04)
  age_at_service       INTEGER,
  is_pediatric         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Financial
  total_claimed        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_received      NUMERIC(10, 2),

  -- Claim tracking
  claim_number         TEXT,
  batch_id             TEXT,
  status               TEXT DEFAULT 'draft'
                       CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),

  -- Timestamps
  submitted_at         TIMESTAMPTZ,
  approved_at          TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),

  -- RAMQ response
  ramq_response        JSONB,
  rejection_code       TEXT,
  rejection_reason     TEXT,
  notes                TEXT
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ramq_claims_user_id     ON public.ramq_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_ramq_claims_status      ON public.ramq_claims(status);
CREATE INDEX IF NOT EXISTS idx_ramq_claims_service_date ON public.ramq_claims(service_date);
CREATE INDEX IF NOT EXISTS idx_ramq_claims_patient_ramq ON public.ramq_claims(patient_ramq);

-- =====================================================
-- 3. UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ramq_claims_updated_at ON public.ramq_claims;
CREATE TRIGGER trg_ramq_claims_updated_at
  BEFORE UPDATE ON public.ramq_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.ramq_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON public.ramq_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims"
  ON public.ramq_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claims"
  ON public.ramq_claims FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own draft claims"
  ON public.ramq_claims FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- =====================================================
-- 5. RAMQ_CLAIMS_ARCHIVE
-- Slim copy of paid/rejected claims for long-term retention
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ramq_claims_archive (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name      TEXT NOT NULL,
  patient_ramq      TEXT NOT NULL,
  service_date      DATE NOT NULL,
  act_codes         JSONB,
  total_claimed     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_received   NUMERIC(10, 2),
  status            TEXT,
  claim_number      TEXT,
  batch_id          TEXT,
  submitted_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  rejection_reason  TEXT,
  ramq_response     JSONB,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ramq_claims_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archived claims"
  ON public.ramq_claims_archive FOR SELECT
  USING (auth.uid() = user_id);

-- Only the system (service role) should archive claims
CREATE POLICY "Service role can insert archives"
  ON public.ramq_claims_archive FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
