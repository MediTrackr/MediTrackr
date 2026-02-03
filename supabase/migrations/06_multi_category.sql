-- Migration 06: Multi-select professional categories and remuneration modes
-- Run this in Supabase SQL Editor AFTER migration 05

-- =====================================================
-- 1. PROFILES: Replace single category with array
-- =====================================================

-- Add new array columns (keep old single-value column for now)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_categories  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS remuneration_modes        TEXT[]  DEFAULT '{}';

-- Migrate existing single-value data to array (if migration 05 was already run)
UPDATE public.profiles
  SET professional_categories = ARRAY[professional_category]
  WHERE professional_category IS NOT NULL
    AND (professional_categories IS NULL OR professional_categories = '{}');

-- Valid values check for array elements
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_professional_categories;

-- Note: PostgreSQL doesn't support array element CHECK constraints natively without a function
-- Use application-level validation (utils/ramq-categories.ts) as the guard

-- Valid remuneration modes
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_remuneration_modes;

-- =====================================================
-- 2. RAMQ_CLAIMS: store which category was used
-- =====================================================
-- professional_category column was added in migration 05 — no change needed here
-- It stores the SINGLE category chosen for this specific claim

-- =====================================================
-- 3. Optional: drop old single-value column after migration
-- (Only run if you've confirmed all data is migrated)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS professional_category;
-- =====================================================
