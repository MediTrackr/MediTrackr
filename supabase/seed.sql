-- MediTrackr Development Seed
-- =====================================================
-- HOW TO USE
-- 1. Run all migrations first (00 through 07)
-- 2. Create a test user via the Supabase Dashboard or Auth API
-- 3. Replace the TEST_USER_ID placeholder below with that user's UUID
-- 4. Run this file in the Supabase SQL Editor (or via CLI: supabase db seed)
--
-- To find your user UUID after signup:
--   SELECT id FROM auth.users WHERE email = 'your@email.com';
-- =====================================================

DO $$
DECLARE
  -- Replace this with a real auth.users UUID from your dev Supabase instance
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';

  -- Locality codes used in claims (must exist in localities table)
  v_loc_montreal  TEXT := '66200';  -- Montréal
  v_loc_quebec    TEXT := '62014';  -- Québec
  v_loc_laval     TEXT := '66252';  -- Laval

  -- Claim IDs for hanging_claims references
  v_claim1 UUID;
  v_claim2 UUID;
  v_claim3 UUID;
  v_claim4 UUID;
  v_claim5 UUID;

  -- Invoice ID
  v_invoice1 UUID;

  -- Expense IDs
  v_expense1 UUID;
  v_expense2 UUID;
BEGIN

-- =====================================================
-- GUARD: skip if test user doesn't exist
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
  RAISE NOTICE 'TEST USER % NOT FOUND — skipping seed. Create the user first.', v_user_id;
  RETURN;
END IF;

-- =====================================================
-- 1. PROFILE
-- =====================================================
INSERT INTO public.profiles (
  id, email, first_name, last_name, prefix,
  practice_name, specialty, ramq_number, license_number,
  phone, address, professional_categories, remuneration_modes,
  privacy_consent_given, privacy_consent_date
) VALUES (
  v_user_id,
  'dr.test@meditrackr.dev',
  'Marie',
  'Tremblay',
  'Dr.',
  'Clinique Tremblay',
  'Médecine générale',
  '100001',
  'MDQ-12345',
  '514-555-0100',
  '1234 Rue Sherbrooke, Montréal, QC H3H 1E7',
  ARRAY['omni'],
  ARRAY['RFP'],
  TRUE,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  first_name             = EXCLUDED.first_name,
  last_name              = EXCLUDED.last_name,
  ramq_number            = EXCLUDED.ramq_number,
  professional_categories = EXCLUDED.professional_categories,
  updated_at             = NOW();

-- =====================================================
-- 2. PRACTICE SETTINGS
-- =====================================================
INSERT INTO public.practice_settings (
  user_id, practice_name, practice_address,
  facility_type, primary_facility_code, primary_facility_name,
  tax_number, bank_name, institution_number, transit_number, account_number
) VALUES (
  v_user_id,
  'Clinique Tremblay',
  '1234 Rue Sherbrooke, Montréal, QC H3H 1E7',
  'cabinet_prive',
  '99001',
  'Clinique Tremblay',
  'TRQ123456789',
  'Banque Nationale',
  '006',
  '00123',
  '1234567'
) ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 3. RAMQ CLAIMS — various statuses
-- =====================================================

-- Draft claim (in progress)
INSERT INTO public.ramq_claims (
  user_id, patient_name, patient_ramq, patient_dob,
  doctor_ramq, professional_category, service_date,
  location_code, act_codes, total_claimed, status, notes
) VALUES (
  v_user_id,
  'Jean-Pierre Gagnon',
  'GAGJ 8501 0112 34',
  '1985-01-01',
  '100001',
  'omni',
  CURRENT_DATE - 5,
  v_loc_montreal,
  '[{"code":"00015","description":"Consultation en cabinet","fee":36.50},{"code":"00020","description":"Examen complet","fee":67.25}]'::jsonb,
  103.75,
  'draft',
  'Première consultation — dossier à compléter'
) RETURNING id INTO v_claim1;

-- Submitted claim (recent)
INSERT INTO public.ramq_claims (
  user_id, patient_name, patient_ramq, patient_dob,
  doctor_ramq, professional_category, service_date,
  location_code, act_codes, total_claimed, status,
  submitted_at, diagnostic_code, diagnostic_desc
) VALUES (
  v_user_id,
  'Sophie Bouchard',
  'BOUS 9203 2298 76',
  '1992-03-22',
  '100001',
  'omni',
  CURRENT_DATE - 15,
  v_loc_montreal,
  '[{"code":"00015","description":"Consultation en cabinet","fee":36.50}]'::jsonb,
  36.50,
  'submitted',
  NOW() - INTERVAL '14 days',
  'J06.9',
  'Infection des voies respiratoires supérieures'
) RETURNING id INTO v_claim2;

-- Approved claim
INSERT INTO public.ramq_claims (
  user_id, patient_name, patient_ramq, patient_dob,
  doctor_ramq, professional_category, service_date,
  location_code, act_codes, total_claimed, amount_received, status,
  submitted_at, approved_at, diagnostic_code, diagnostic_desc, claim_number
) VALUES (
  v_user_id,
  'Marc Côté',
  'COTM 7808 1560 21',
  '1978-08-15',
  '100001',
  'omni',
  CURRENT_DATE - 45,
  v_loc_quebec,
  '[{"code":"00015","description":"Consultation en cabinet","fee":36.50},{"code":"09005","description":"Électrocardiogramme","fee":28.75}]'::jsonb,
  65.25,
  65.25,
  'approved',
  NOW() - INTERVAL '44 days',
  NOW() - INTERVAL '30 days',
  'I10',
  'Hypertension artérielle essentielle',
  'RAMQ-2025-001234'
) RETURNING id INTO v_claim3;

-- Paid claim
INSERT INTO public.ramq_claims (
  user_id, patient_name, patient_ramq, patient_dob,
  doctor_ramq, professional_category, service_date,
  location_code, act_codes, total_claimed, amount_received, status,
  submitted_at, approved_at, paid_at, claim_number, diagnostic_code, diagnostic_desc
) VALUES (
  v_user_id,
  'Lucie Simard',
  'SIMJ 8811 3078 45',
  '1988-11-30',
  '100001',
  'omni',
  CURRENT_DATE - 60,
  v_loc_laval,
  '[{"code":"00015","description":"Consultation en cabinet","fee":36.50},{"code":"09140","description":"Traitement local","fee":14.00}]'::jsonb,
  50.50,
  50.50,
  'paid',
  NOW() - INTERVAL '58 days',
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '20 days',
  'RAMQ-2025-001100',
  'K29.5',
  'Gastrite chronique'
) RETURNING id INTO v_claim4;

-- Rejected claim (for testing rejection UI)
INSERT INTO public.ramq_claims (
  user_id, patient_name, patient_ramq,
  doctor_ramq, professional_category, service_date,
  location_code, act_codes, total_claimed, status,
  submitted_at, rejection_code, rejection_reason, claim_number
) VALUES (
  v_user_id,
  'Pierre Lavoie',
  'LAVP 7005 2289 32',
  '100001',
  'omni',
  CURRENT_DATE - 40,
  v_loc_montreal,
  '[{"code":"15600","description":"Acte non couvert","fee":45.00}]'::jsonb,
  45.00,
  'rejected',
  NOW() - INTERVAL '38 days',
  'E001',
  'Code d''acte non reconnu pour cette spécialité',
  'RAMQ-2025-000987'
) RETURNING id INTO v_claim5;

-- =====================================================
-- 4. HANGING CLAIMS (overdue submitted claims)
-- =====================================================
INSERT INTO public.hanging_claims (
  user_id, patient_name, claim_number, amount_outstanding, days_outstanding, status
) VALUES
  (v_user_id, 'Sophie Bouchard', NULL,          36.50, 14, 'pending'),
  (v_user_id, 'Robert Forget',   'RAMQ-2025-X', 125.00, 75, 'pending'),
  (v_user_id, 'Nadia Ouellet',   'RAMQ-2025-Y', 88.25,  62, 'pending');

-- =====================================================
-- 5. EXPENSES
-- =====================================================
INSERT INTO public.expenses (
  user_id, category, vendor, amount, expense_date,
  description, status, is_reimbursable, payment_method
) VALUES
  (v_user_id, 'Fournitures médicales', 'Medline Canada',      245.80, CURRENT_DATE - 10, 'Gants, seringues, pansements', 'approved', TRUE, 'credit_card'),
  (v_user_id, 'Formation continue',    'CMQ — Colloque 2025', 395.00, CURRENT_DATE - 20, 'Conférence annuelle CMQ', 'approved', TRUE, 'bank_transfer'),
  (v_user_id, 'Logiciels',             'Microsoft 365',       149.99, CURRENT_DATE - 30, 'Abonnement annuel', 'approved', FALSE, 'credit_card'),
  (v_user_id, 'Loyer cabinet',         'Gestion Immo Laval',  1800.00, CURRENT_DATE - 5, 'Loyer mensuel cabinet', 'pending', FALSE, 'bank_transfer')
RETURNING id INTO v_expense1;

-- =====================================================
-- 6. INVOICE (legacy / private billing)
-- =====================================================
INSERT INTO public.invoices (
  user_id, patient_name, service_type, amount, total_amount,
  status, consultation_date, notes
) VALUES (
  v_user_id,
  'Alain Bergeron',
  'Consultation privée',
  175.00,
  175.00,
  'pending',
  CURRENT_DATE - 3,
  'Patient hors RAMQ — facturation directe'
) RETURNING id INTO v_invoice1;

-- =====================================================
-- 7. BUDGETS
-- =====================================================
INSERT INTO public.budgets (
  user_id, budget_name, category,
  planned_amount, actual_amount, period_start, period_end, notes
) VALUES
  (v_user_id, 'Budget Q2 2026 — Fournitures',  'Fournitures médicales',  3000.00, 245.80,  '2026-04-01', '2026-06-30', 'Objectif: rester sous $30k/an'),
  (v_user_id, 'Budget Q2 2026 — Formation',    'Formation continue',     1500.00, 395.00,  '2026-04-01', '2026-06-30', NULL),
  (v_user_id, 'Budget Q2 2026 — Loyer',        'Loyer cabinet',          5400.00, 1800.00, '2026-04-01', '2026-06-30', 'Loyer mensuel × 3 mois');

-- =====================================================
-- 8. PARTNER (billing company / clinic)
-- =====================================================
INSERT INTO public.partners (
  user_id, name, category, partner_type,
  facility_type, contact_person, email, phone, is_default
) VALUES (
  v_user_id,
  'Polyclinique Montréal-Nord',
  'facility',
  'clinic',
  'polyclinique',
  'Mme. Leclerc',
  'admin@pmn.qc.ca',
  '514-555-0200',
  TRUE
) ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Seed completed for user %', v_user_id;
RAISE NOTICE '   → Profile, practice settings, 5 RAMQ claims, 3 hanging claims, 4 expenses, 3 budgets, 1 invoice, 1 partner';

END $$;
