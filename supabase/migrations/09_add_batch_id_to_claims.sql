-- Migration 09: Add batch_id to non-RAMQ claim tables
-- ramq_claims already has batch_id; extend the same pattern to all claim types.

ALTER TABLE public.federal_claims
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.invoice_batches(id) ON DELETE SET NULL;

ALTER TABLE public.out_of_province_claims
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.invoice_batches(id) ON DELETE SET NULL;

ALTER TABLE public.diplomatic_claims
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.invoice_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_federal_claims_batch_id       ON public.federal_claims(batch_id);
CREATE INDEX IF NOT EXISTS idx_out_of_province_claims_batch_id ON public.out_of_province_claims(batch_id);
CREATE INDEX IF NOT EXISTS idx_diplomatic_claims_batch_id    ON public.diplomatic_claims(batch_id);
