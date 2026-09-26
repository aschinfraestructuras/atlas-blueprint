-- [1] Aprovação externa em documentos
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS external_approval_ref    text,
  ADD COLUMN IF NOT EXISTS external_approved_by     text,
  ADD COLUMN IF NOT EXISTS external_approved_at     date,
  ADD COLUMN IF NOT EXISTS external_approval_entity text;

-- [2] Corrigir equipment_type por código/modelo exacto
UPDATE public.topography_equipment SET equipment_type =
  CASE code
    WHEN 'EME-PF17A-001' THEN 'gamma_densimetro'
    WHEN 'EME-PF17A-002' THEN 'placa_carga'
    WHEN 'EME-PF17A-003' THEN 'outro'
    WHEN 'EME-PF17A-004' THEN 'cone_abrams'
    WHEN 'EME-PF17A-005' THEN 'aparelho_us'
    WHEN 'EME-PF17A-006' THEN 'gabarit'
    WHEN 'EME-PF17A-007' THEN 'bitolimetro'
    WHEN 'EME-PF17A-008' THEN 'outro'
    WHEN 'EME-PF17A-011' THEN 'outro'
    WHEN 'EME-PF17A-012' THEN 'megaohmimetro'
    WHEN 'EME-PF17A-013' THEN 'multimetro'
    WHEN 'EME-PF17A-014' THEN 'otdr'
    WHEN 'EME-PF17A-015' THEN 'chave_dinamometrica'
    WHEN 'EME-PF17A-016' THEN 'esclerometro'
    WHEN 'EME-PF17A-017' THEN 'outro'
    ELSE equipment_type
  END
WHERE project_id = 'aaaaaaaa-0001-0001-0001-000000000001';

-- [3] Check constraint para tipos válidos de EME
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_equipment_type_valid'
    AND conrelid = 'public.topography_equipment'::regclass
  ) THEN
    ALTER TABLE public.topography_equipment
      ADD CONSTRAINT chk_equipment_type_valid
      CHECK (equipment_type IN (
        'estacao_total','nivel','gps_gnss','drone',
        'gamma_densimetro','cone_abrams','esclerometro',
        'aparelho_us','placa_carga','chave_dinamometrica',
        'bitolimetro','gabarit','otdr','megaohmimetro',
        'multimetro','analisador_rede','outro'
      ));
  END IF;
END $$;
