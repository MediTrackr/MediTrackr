-- Migration 10: Billing Command Center
-- Extends ramq_claims status enum with 'partial' and 'review_needed',
-- adds reviewed_at timestamp, and creates a summary view for the command center.

-- =====================================================
-- 1. EXTEND STATUS CONSTRAINT
-- Drop the inline check and replace with a broader one.
-- =====================================================
ALTER TABLE public.ramq_claims
  DROP CONSTRAINT IF EXISTS ramq_claims_status_check;

ALTER TABLE public.ramq_claims
  ADD CONSTRAINT ramq_claims_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'paid',
    'partial',        -- received less than total_claimed
    'review_needed'   -- flagged for manual review (mismatch, dispute, etc.)
  ));

-- =====================================================
-- 2. ADD reviewed_at TIMESTAMP
-- Tracks when a claim was flagged or resolved for review.
-- =====================================================
ALTER TABLE public.ramq_claims
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- =====================================================
-- 3. BILLING SUMMARY VIEW
-- Per-user aggregates for the command center header cards.
-- pending = submitted + approved (awaiting RAMQ response)
-- partial = paid but amount_received < total_claimed, OR status='partial'
-- =====================================================
CREATE OR REPLACE VIEW public.billing_summary AS
SELECT
  user_id,

  -- Draft
  COUNT(*) FILTER (WHERE status = 'draft')                                     AS draft_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'draft'), 0)              AS draft_amount,

  -- Pending (submitted + approved)
  COUNT(*) FILTER (WHERE status IN ('submitted', 'approved'))                   AS pending_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status IN ('submitted','approved')), 0) AS pending_amount,

  -- Paid (fully reimbursed)
  COUNT(*) FILTER (
    WHERE status = 'paid'
    AND (amount_received IS NULL OR amount_received >= total_claimed * 0.99)
  )                                                                              AS paid_count,
  COALESCE(SUM(amount_received) FILTER (
    WHERE status = 'paid'
    AND (amount_received IS NULL OR amount_received >= total_claimed * 0.99)
  ), 0)                                                                          AS paid_amount,

  -- Partial (status='partial' OR paid with shortfall)
  COUNT(*) FILTER (
    WHERE status = 'partial'
    OR (status = 'paid' AND amount_received IS NOT NULL AND amount_received < total_claimed * 0.99)
  )                                                                              AS partial_count,
  COALESCE(SUM(total_claimed) FILTER (
    WHERE status = 'partial'
    OR (status = 'paid' AND amount_received IS NOT NULL AND amount_received < total_claimed * 0.99)
  ), 0)                                                                          AS partial_amount,

  -- Rejected
  COUNT(*) FILTER (WHERE status = 'rejected')                                   AS rejected_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'rejected'), 0)            AS rejected_amount,

  -- Review Needed
  COUNT(*) FILTER (WHERE status = 'review_needed')                              AS review_count,
  COALESCE(SUM(total_claimed) FILTER (WHERE status = 'review_needed'), 0)       AS review_amount,

  -- Totals
  COUNT(*)                                                                       AS total_count,
  COALESCE(SUM(total_claimed), 0)                                               AS total_claimed,
  COALESCE(SUM(COALESCE(amount_received, 0)), 0)                                AS total_received,
  COALESCE(SUM(total_claimed) - SUM(COALESCE(amount_received, 0)), 0)           AS total_outstanding

FROM public.ramq_claims
GROUP BY user_id;
