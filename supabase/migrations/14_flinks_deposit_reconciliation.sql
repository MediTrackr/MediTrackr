-- Migration 14: Flinks Deposit Reconciliation
-- Adds deposit_received + reconciliation_pending statuses and bank_deposits table.

-- =====================================================
-- 1. EXTEND RAMQ STATUS CONSTRAINT
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
    'partial',
    'review_needed',
    'deposit_received',     -- bank deposit detected via Flinks, remittance not yet received
    'reconciliation_pending' -- remittance received via fax, matching in progress
  ));

-- =====================================================
-- 2. EXTEND PFSI STATUS CONSTRAINT
-- =====================================================
ALTER TABLE public.pfsi_claims
  DROP CONSTRAINT IF EXISTS pfsi_claims_status_check;

ALTER TABLE public.pfsi_claims
  ADD CONSTRAINT pfsi_claims_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'paid',
    'partial',
    'review_needed',
    'deposit_received',
    'reconciliation_pending'
  ));

-- =====================================================
-- 3. ADD TIMESTAMP COLUMNS TO RAMQ_CLAIMS
-- =====================================================
ALTER TABLE public.ramq_claims
  ADD COLUMN IF NOT EXISTS deposit_detected_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_amount        NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS deposit_id            UUID; -- FK to bank_deposits

-- =====================================================
-- 4. BANK DEPOSITS TABLE (Flinks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bank_deposits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Flinks identifiers
  flinks_account_id     TEXT NOT NULL,
  flinks_transaction_id TEXT UNIQUE,

  -- Deposit details
  amount                NUMERIC(10, 2) NOT NULL,
  deposit_date          DATE NOT NULL,
  description           TEXT,
  institution           TEXT, -- e.g. "Desjardins", "RBC"

  -- Matching
  matched_batch_id      TEXT,   -- ramq_claims.batch_id
  matched_claim_ids     UUID[], -- individual claims matched to this deposit
  match_confidence      TEXT CHECK (match_confidence IN ('exact', 'approximate', 'manual', 'unmatched'))
                        DEFAULT 'unmatched',

  -- Status
  status                TEXT CHECK (status IN ('unmatched', 'matched', 'reconciled', 'disputed'))
                        DEFAULT 'unmatched',

  -- Raw Flinks payload for audit
  raw_payload           JSONB,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. FK — RAMQ_CLAIMS → BANK_DEPOSITS
-- =====================================================
ALTER TABLE public.ramq_claims
  ADD CONSTRAINT fk_ramq_claims_deposit
  FOREIGN KEY (deposit_id) REFERENCES public.bank_deposits(id)
  ON DELETE SET NULL;

-- =====================================================
-- 6. RLS
-- =====================================================
ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own deposits"
  ON public.bank_deposits FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. UPDATED_AT TRIGGER
-- =====================================================
CREATE TRIGGER bank_deposits_updated_at
  BEFORE UPDATE ON public.bank_deposits
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- =====================================================
-- 8. FLINKS CONNECTED ACCOUNTS TABLE
-- Stores the user's Flinks loginId (tokenized — no passwords)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flinks_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  flinks_login_id   TEXT NOT NULL,   -- Flinks loginId (token, not credentials)
  institution       TEXT,
  account_label     TEXT,
  connected_at      TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at    TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.flinks_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own flinks accounts"
  ON public.flinks_accounts FOR ALL
  USING (auth.uid() = user_id);
