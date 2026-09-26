-- 1. Adicionar sort_order a ppi_templates
ALTER TABLE public.ppi_templates
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT NULL;

-- 2. Popular sort_order para os 12 PPIs do PF17A por número
UPDATE public.ppi_templates SET sort_order = 1  WHERE code = 'PPI-PF17A-01';
UPDATE public.ppi_templates SET sort_order = 2  WHERE code = 'PPI-PF17A-02';
UPDATE public.ppi_templates SET sort_order = 3  WHERE code = 'PPI-PF17A-03';
UPDATE public.ppi_templates SET sort_order = 4  WHERE code = 'PPI-PF17A-04';
UPDATE public.ppi_templates SET sort_order = 5  WHERE code = 'PPI-PF17A-05';
UPDATE public.ppi_templates SET sort_order = 6  WHERE code = 'PPI-PF17A-06';
UPDATE public.ppi_templates SET sort_order = 7  WHERE code = 'PPI-PF17A-07';
UPDATE public.ppi_templates SET sort_order = 8  WHERE code = 'PPI-PF17A-08';
UPDATE public.ppi_templates SET sort_order = 9  WHERE code = 'PPI-PF17A-09';
UPDATE public.ppi_templates SET sort_order = 10 WHERE code = 'PPI-PF17A-10';
UPDATE public.ppi_templates SET sort_order = 11 WHERE code = 'PPI-PF17A-11';
UPDATE public.ppi_templates SET sort_order = 12 WHERE code = 'PPI-PF17A-12';

-- 3. Eliminar PPI-PF17A-11-COPY (sem instâncias, já inactivo — lixo limpo)
DELETE FROM public.ppi_templates
WHERE code = 'PPI-PF17A-11-COPY'
  AND is_active = false
  AND NOT EXISTS (
    SELECT 1 FROM public.ppi_instances pi
    WHERE pi.template_id = ppi_templates.id
  );

-- 4. Confirmar resultado
SELECT code, title, sort_order, is_active
FROM public.ppi_templates
WHERE is_active = true
ORDER BY sort_order NULLS LAST, code;
