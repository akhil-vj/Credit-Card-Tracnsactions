
CREATE TABLE public.screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  hash text NOT NULL,
  file_name text,
  mime text NOT NULL DEFAULT 'image/png',
  image_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_analyzed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screenshots TO anon, authenticated;
GRANT ALL ON public.screenshots TO service_role;

ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"   ON public.screenshots FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.screenshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.screenshots FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON public.screenshots FOR DELETE USING (true);

ALTER TABLE public.transactions
  ADD COLUMN screenshot_id uuid REFERENCES public.screenshots(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_screenshot_id ON public.transactions(screenshot_id);
CREATE INDEX idx_screenshots_device_id ON public.screenshots(device_id);
