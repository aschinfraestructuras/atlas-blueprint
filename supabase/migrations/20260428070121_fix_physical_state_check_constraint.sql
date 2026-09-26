-- Actualizar constraint para aceitar os valores do formulário
ALTER TABLE public.material_lots 
  DROP CONSTRAINT material_lots_physical_state_check;

ALTER TABLE public.material_lots
  ADD CONSTRAINT material_lots_physical_state_check
  CHECK (physical_state = ANY (ARRAY[
    'pending'::text, 
    'conform'::text, 
    'non_conform'::text,
    'conforme'::text,
    'nao_conforme'::text
  ]));
