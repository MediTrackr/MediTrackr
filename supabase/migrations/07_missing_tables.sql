-- Migration 07: Create all tables missing from tracked migrations
-- These tables exist in the live Supabase DB but were created via the console.
-- This migration brings them into version control.
-- Safe to run on a fresh DB; uses CREATE TABLE IF NOT EXISTS throughout.

-- =====================================================
-- 1. PRACTICE_SETTINGS
-- Set during onboarding; one row per user.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.practice_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_name         TEXT,
  practice_address      TEXT,
  facility_type         TEXT,
  primary_facility_code TEXT,
  primary_facility_name TEXT,
  site_appartenance     TEXT,
  tax_number            TEXT,
  bank_name             TEXT,
  institution_number    TEXT,
  transit_number        TEXT,
  account_number        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice settings"
  ON public.practice_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own practice settings"
  ON public.practice_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice settings"
  ON public.practice_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. HANGING_CLAIMS
-- Overdue claims (>60 days outstanding); populated by
-- the automate_hanging_claims() DB function.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hanging_claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name      TEXT NOT NULL,
  claim_number      TEXT,
  amount_outstanding NUMERIC(10, 2) NOT NULL,
  days_outstanding  INTEGER NOT NULL DEFAULT 0,
  last_follow_up    DATE,
  status            TEXT DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hanging_claims_user_id ON public.hanging_claims(user_id);

ALTER TABLE public.hanging_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hanging claims"
  ON public.hanging_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hanging claims"
  ON public.hanging_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hanging claims"
  ON public.hanging_claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hanging claims"
  ON public.hanging_claims FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. AUDIT_LOG
-- Compliance trail for Law 25 (Quebec privacy law).
-- Populated by lib/compliance/audit-middleware.ts.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name     TEXT NOT NULL,
  record_id      TEXT NOT NULL,
  action         TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'VIEW')),
  old_values     JSONB,
  new_values     JSONB,
  changed_fields TEXT[],
  reason         TEXT,
  ip_address     INET,
  user_agent     TEXT,
  session_id     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit entries; only service role writes
CREATE POLICY "Users can view own audit log"
  ON public.audit_log FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 4. PARTNERS
-- Clinics, hospitals, or billing companies associated with a user.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partners (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  partner_type   TEXT,
  facility_type  TEXT,
  partner_code   TEXT,
  contact_person TEXT,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  is_default     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own partners"
  ON public.partners FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. PAYER_TYPES
-- Reference table: RAMQ, federal, out-of-province, etc.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payer_types (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  submission_format     TEXT,
  payment_timeline_days INTEGER,
  requires_prior_auth   BOOLEAN DEFAULT FALSE,
  active                BOOLEAN DEFAULT TRUE,
  contact_info          JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payer_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read payer types"
  ON public.payer_types FOR SELECT USING (auth.role() = 'authenticated');

-- Seed core payer types
INSERT INTO public.payer_types (code, name, description, payment_timeline_days, active)
VALUES
  ('RAMQ',       'Régie de l''assurance maladie du Québec', 'Provincial health insurer for Quebec', 30, true),
  ('FEDERAL',    'Services aux Autochtones Canada',         'Federal health benefits for First Nations', 45, true),
  ('OUT_PROV',   'Out-of-Province',                         'Reciprocal billing for patients from other provinces', 60, true),
  ('DIPLOMATIC', 'Diplomatic / Embassy',                    'Billing for diplomatic personnel', 90, true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 6. RAMQ_ACT_CODES
-- Reference table for billable act codes with base fees.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ramq_act_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  base_fee    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category    TEXT,
  specialty   TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ramq_act_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read act codes"
  ON public.ramq_act_codes FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 7. RAMQ_CODES (extended code registry)
-- Includes component type, modifier rules, min time.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ramq_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE NOT NULL,
  description       TEXT NOT NULL,
  fee_base          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category          TEXT,
  specialty_group   TEXT,
  component_type    TEXT,
  min_time_minutes  INTEGER,
  requires_modifier BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.ramq_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ramq codes"
  ON public.ramq_codes FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 8. HEALTHCARE_DIRECTORY
-- Clinics, hospitals, specialists — searchable reference.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.healthcare_directory (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  sub_type    TEXT,
  code        TEXT,
  specialty   TEXT,
  description TEXT,
  base_fee    NUMERIC(10, 2),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.healthcare_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read healthcare directory"
  ON public.healthcare_directory FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 9. PAYMENTS
-- Records individual payment transactions linked to invoices.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id       UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount           NUMERIC(10, 2) NOT NULL,
  payment_method   TEXT,
  payment_date     DATE,
  reference_number TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id    ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payments"
  ON public.payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 10. RECEIPTS
-- Stripe-generated or manual receipts tied to payments.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id             UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id             UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  amount                 NUMERIC(10, 2) NOT NULL,
  patient_email          TEXT,
  receipt_url            TEXT,
  stripe_payment_intent  TEXT,
  email_sent             BOOLEAN DEFAULT FALSE,
  email_sent_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own receipts"
  ON public.receipts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 11. INVOICING_COMPANIES
-- External billing companies that submit invoices on behalf of users.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoicing_companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  company_name   TEXT,
  billing_code   TEXT,
  contact_person TEXT,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  tax_id         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoicing_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoicing companies"
  ON public.invoicing_companies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 12. INVOICE_BATCHES
-- Groups of invoices submitted together.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES public.invoicing_companies(id) ON DELETE SET NULL,
  partner_id      UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  batch_name      TEXT,
  batch_date      DATE,
  invoice_count   INTEGER DEFAULT 0,
  total_amount    NUMERIC(10, 2) DEFAULT 0,
  status          TEXT DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  transferred_at  TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoice_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice batches"
  ON public.invoice_batches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 13. FEDERAL_CLAIMS
-- Claims submitted to federal payers (First Nations, NIHB, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.federal_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_type          TEXT REFERENCES public.payer_types(code),
  patient_name        TEXT NOT NULL,
  patient_federal_id  TEXT,
  unit_or_facility    TEXT,
  authorizing_officer TEXT,
  service_date        DATE NOT NULL,
  service_codes       JSONB,
  total_claimed       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_approved     NUMERIC(10, 2),
  amount_received     NUMERIC(10, 2),
  prior_auth_number   TEXT,
  prior_auth_date     DATE,
  approval_number     TEXT,
  claim_number        TEXT,
  submitted_via       TEXT,
  status              TEXT DEFAULT 'draft',
  submitted_at        TIMESTAMPTZ,
  rejection_reason    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.federal_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own federal claims"
  ON public.federal_claims FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 14. OUT_OF_PROVINCE_CLAIMS
-- Claims for patients from other Canadian provinces.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.out_of_province_claims (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name             TEXT NOT NULL,
  patient_health_number    TEXT NOT NULL,
  patient_province         TEXT NOT NULL,
  province_code            TEXT NOT NULL,
  province_health_plan     TEXT,
  service_date             DATE NOT NULL,
  service_codes            JSONB,
  total_claimed            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_received          NUMERIC(10, 2),
  has_reciprocal_agreement BOOLEAN DEFAULT TRUE,
  agreement_details        TEXT,
  billing_method           TEXT,
  claim_number             TEXT,
  status                   TEXT DEFAULT 'draft',
  submitted_at             TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.out_of_province_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own out-of-province claims"
  ON public.out_of_province_claims FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 15. DIPLOMATIC_CLAIMS
-- Claims for embassy/consulate personnel.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.diplomatic_claims (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_code                TEXT NOT NULL,
  country_code                TEXT NOT NULL,
  embassy_or_consulate        TEXT NOT NULL,
  classification_level        TEXT,
  security_clearance_level    TEXT,
  diplomatic_protocol_number  TEXT,
  authorization_number        TEXT,
  service_date                DATE NOT NULL,
  service_codes               JSONB,
  total_claimed               NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_received             NUMERIC(10, 2),
  billing_contact_name        TEXT,
  billing_contact_email       TEXT,
  billing_contact_phone       TEXT,
  requires_encryption         BOOLEAN DEFAULT FALSE,
  status                      TEXT DEFAULT 'draft',
  submitted_at                TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.diplomatic_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own diplomatic claims"
  ON public.diplomatic_claims FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 16. SHADOW_LEDGER
-- Tracks expected vs actual payments for reconciliation.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shadow_ledger (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_id              UUID,
  invoice_id            UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_source        TEXT,
  expected_amount       NUMERIC(10, 2) NOT NULL,
  expected_date         DATE NOT NULL,
  actual_amount         NUMERIC(10, 2),
  actual_date           DATE,
  variance_amount       NUMERIC(10, 2),
  variance_percentage   NUMERIC(5, 2),
  discrepancy_reason    TEXT,
  calculation_basis     JSONB,
  reconciliation_batch  TEXT,
  reconciliation_date   DATE,
  resolved              BOOLEAN DEFAULT FALSE,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shadow_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shadow ledger"
  ON public.shadow_ledger FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 17. CIUSSS_FEE_SCHEDULES
-- Fee schedules for CIUSSS/institutional billing.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ciusss_fee_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code         TEXT NOT NULL,
  site_name         TEXT NOT NULL,
  internal_code     TEXT NOT NULL,
  description       TEXT NOT NULL,
  standard_ramq_code TEXT,
  base_fee          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payer_type        TEXT REFERENCES public.payer_types(code),
  facility_type     TEXT,
  specialty         TEXT,
  requires_modifier BOOLEAN DEFAULT FALSE,
  effective_date    DATE,
  expiry_date       DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ciusss_fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read CIUSSS fee schedules"
  ON public.ciusss_fee_schedules FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 18. PUBLIC_FACILITY_FEE_SCHEDULES
-- Fee schedules for public hospital/CLSC billing.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.public_facility_fee_schedules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_code      TEXT NOT NULL,
  facility_name      TEXT NOT NULL,
  facility_type      TEXT,
  internal_code      TEXT NOT NULL,
  description        TEXT NOT NULL,
  standard_ramq_code TEXT,
  base_fee           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payer_type         TEXT REFERENCES public.payer_types(code),
  specialty          TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.public_facility_fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read public facility fee schedules"
  ON public.public_facility_fee_schedules FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- 19. PAYMENT_DISCREPANCIES VIEW
-- Aggregates unresolved shadow ledger entries per user.
-- =====================================================
CREATE OR REPLACE VIEW public.payment_discrepancies AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE NOT resolved)                         AS unresolved_count,
  COUNT(*)                                                     AS total_discrepancies,
  SUM(ABS(variance_amount)) FILTER (WHERE NOT resolved)        AS total_variance,
  AVG(variance_percentage) FILTER (WHERE NOT resolved)         AS avg_variance_pct
FROM public.shadow_ledger
GROUP BY user_id;

-- =====================================================
-- 20. AUTOMATE_HANGING_CLAIMS FUNCTION
-- Moves overdue submitted RAMQ claims to hanging_claims.
-- Called via pg_cron or manually.
-- =====================================================
CREATE OR REPLACE FUNCTION public.automate_hanging_claims()
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.hanging_claims (user_id, patient_name, claim_number, amount_outstanding, days_outstanding)
  SELECT
    user_id,
    patient_name,
    claim_number,
    total_claimed - COALESCE(amount_received, 0) AS amount_outstanding,
    (CURRENT_DATE - submitted_at::date)           AS days_outstanding
  FROM public.ramq_claims
  WHERE status = 'submitted'
    AND submitted_at IS NOT NULL
    AND (CURRENT_DATE - submitted_at::date) > 60
    AND id NOT IN (SELECT DISTINCT claim_number FROM public.hanging_claims WHERE claim_number IS NOT NULL)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 21. HAS_COMPLETED_ONBOARDING FUNCTION
-- Used by OnboardingCheck component.
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_completed_onboarding(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.practice_settings
    WHERE user_id = p_user_id
      AND practice_name IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
