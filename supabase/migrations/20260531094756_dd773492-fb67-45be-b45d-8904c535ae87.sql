
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS emi_total_months integer,
  ADD COLUMN IF NOT EXISTS emi_paid_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_monthly_amount numeric,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
