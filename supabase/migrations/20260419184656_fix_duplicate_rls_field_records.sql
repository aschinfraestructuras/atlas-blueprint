-- Remover políticas duplicadas nas tabelas field_records, field_record_checks, field_record_materials
-- O Lovable criou "project members access ..." e nós criamos "frc/frm/field_records_project_members"
-- Mantemos as nossas (mais explícitas) e removemos as do Lovable

DROP POLICY IF EXISTS "project members access field_record_checks"   ON public.field_record_checks;
DROP POLICY IF EXISTS "project members access field_record_materials" ON public.field_record_materials;
DROP POLICY IF EXISTS "project members access field_records"          ON public.field_records;
