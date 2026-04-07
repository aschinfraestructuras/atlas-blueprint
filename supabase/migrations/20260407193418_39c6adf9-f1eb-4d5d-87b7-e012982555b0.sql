-- Add geolocation columns to attachments
ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS accuracy_m double precision,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz;

-- Index for spatial queries (simple B-tree on lat/lng)
CREATE INDEX IF NOT EXISTS idx_attachments_geo
  ON public.attachments (latitude, longitude)
  WHERE latitude IS NOT NULL;