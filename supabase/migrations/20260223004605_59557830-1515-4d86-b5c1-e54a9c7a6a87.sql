
-- 9.2: Work Items ↔ Subcontractors (FK directa)
ALTER TABLE public.work_items
ADD COLUMN subcontractor_id uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL;

-- 9.3: Technical Office ↔ Documents (FK directa)
ALTER TABLE public.technical_office_items
ADD COLUMN document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- 9.4: Plans ↔ Documents (FK directa)
ALTER TABLE public.plans
ADD COLUMN document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- Índices para as novas FKs
CREATE INDEX idx_work_items_subcontractor ON public.work_items(subcontractor_id);
CREATE INDEX idx_technical_office_document ON public.technical_office_items(document_id);
CREATE INDEX idx_plans_document ON public.plans(document_id);
