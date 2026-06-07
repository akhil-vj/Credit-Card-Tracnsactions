
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS emi_interest_rate numeric,
  ADD COLUMN IF NOT EXISTS card_account text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_transactions_device_date
  ON public.transactions (device_id, txn_date DESC);
