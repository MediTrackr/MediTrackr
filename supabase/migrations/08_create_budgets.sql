-- Migration 08: Create budgets table
-- Referenced by app/dashboard/budget/NewBudget.tsx and ViewBudgets.tsx
-- but missing from all tracked migrations.

CREATE TABLE IF NOT EXISTS public.budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_name    TEXT,
  category       TEXT,
  planned_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  actual_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  period_start   DATE,
  period_end     DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_budget_dates CHECK (
    period_end IS NULL OR period_start IS NULL OR period_end >= period_start
  ),
  CONSTRAINT check_budget_amounts CHECK (
    planned_amount >= 0 AND actual_amount >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id     ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period_start ON public.budgets(period_start);

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
