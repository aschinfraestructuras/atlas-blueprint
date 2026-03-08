ALTER TABLE public.non_conformities
  ADD COLUMN IF NOT EXISTS discipline_outro text NULL;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS category_outro text NULL;