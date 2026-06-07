
-- Transactions table (no login, public access by design)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  txn_date DATE,
  description TEXT NOT NULL,
  merchant TEXT,
  category TEXT,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('spend','repayment','cashback','charge','refund')),
  is_hidden_charge BOOLEAN NOT NULL DEFAULT false,
  charge_reason TEXT,
  source_screenshot TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_device ON public.transactions(device_id, txn_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public app: anyone can read/write. Device_id scoping is client-side convenience.
CREATE POLICY "Public read" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON public.transactions FOR DELETE USING (true);
