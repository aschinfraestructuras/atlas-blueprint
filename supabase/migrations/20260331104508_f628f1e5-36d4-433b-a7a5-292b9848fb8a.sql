-- Add CE §35 fields to monthly_quality_reports
ALTER TABLE public.monthly_quality_reports
  ADD COLUMN IF NOT EXISTS production_executed text,
  ADD COLUMN IF NOT EXISTS tests_performed text,
  ADD COLUMN IF NOT EXISTS training_sessions text;

-- Add external approval fields to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS external_sent_at date,
  ADD COLUMN IF NOT EXISTS external_response_at date,
  ADD COLUMN IF NOT EXISTS external_approval_status text,
  ADD COLUMN IF NOT EXISTS external_approval_observations text;