-- Migration 05: Add professional_category to profiles and ramq_claims
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. PROFILES: add professional_category + ramq_number
-- =====================================================

-- professional_category drives which RAMQ codes and fields are shown
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_category TEXT,
  ADD COLUMN IF NOT EXISTS ramq_number           TEXT,
  ADD COLUMN IF NOT EXISTS prefix                TEXT,
  ADD COLUMN IF NOT EXISTS first_name            TEXT,
  ADD COLUMN IF NOT EXISTS last_name             TEXT,
  ADD COLUMN IF NOT EXISTS license_number        TEXT,
  ADD COLUMN IF NOT EXISTS phone                 TEXT,
  ADD COLUMN IF NOT EXISTS address               TEXT;

-- Valid categories match ProfessionalCategory type in utils/ramq-categories.ts
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_professional_category;

ALTER TABLE public.profiles
  ADD CONSTRAINT check_professional_category
  CHECK (
    professional_category IS NULL OR professional_category IN (
      'omni',
      'specialist',
      'resident',
      'dietitian',
      'nurse',
      'inhalotherapist',
      'orthotics_lab',
      'podiatrist',
      'midwife',
      'health_establishment',
      'rehab_establishment'
    )
  );

-- =====================================================
-- 2. RAMQ_CLAIMS: add professional_category column
-- =====================================================

ALTER TABLE public.ramq_claims
  ADD COLUMN IF NOT EXISTS professional_category TEXT,
  ADD COLUMN IF NOT EXISTS lmp_date              TEXT;  -- Date des dernières menstruations

-- =====================================================
-- 3. RAMQ_CLAIMS: add diagnostic columns (if not from 04)
-- =====================================================

ALTER TABLE public.ramq_claims
  ADD COLUMN IF NOT EXISTS diagnostic_code TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_desc TEXT;
