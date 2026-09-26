-- ═══════════════════════════════════════════════════════════════════════
-- CAMPOS DE CERTIFICAÇÃO FERROVIÁRIA — EN 14730, EN 13674, IP GR.PR.005
-- Todas as colunas são nullable → sem impacto em dados existentes
-- ═══════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 1. weld_records — certificação do soldador e operador UT           │
-- │    EN 14730-2: qualificação obrigatória documentada por soldadura   │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.weld_records
  ADD COLUMN IF NOT EXISTS operator_cert_valid_until  date        NULL,  -- Validade do certificado do soldador
  ADD COLUMN IF NOT EXISTS operator_cert_entity        text        NULL,  -- Entidade emissora (IP, ADIF, REFER, etc.)
  ADD COLUMN IF NOT EXISTS operator_cert_standard      text        NULL,  -- Norma aplicável (EN 14730-2, etc.)
  ADD COLUMN IF NOT EXISTS ut_cert_ref                 text        NULL,  -- Certificado do operador UT (EN ISO 9712)
  ADD COLUMN IF NOT EXISTS ut_cert_valid_until         date        NULL,  -- Validade do certificado UT
  ADD COLUMN IF NOT EXISTS ut_cert_level               text        NULL,  -- Nível de certificação UT (Nível 1, 2, 3)
  ADD COLUMN IF NOT EXISTS portion_ce_ref              text        NULL,  -- Referência CE da porção/kit aluminotérmico
  ADD COLUMN IF NOT EXISTS approval_body_ref           text        NULL;  -- Referência da aprovação do organismo (NoBo/DeBo)

COMMENT ON COLUMN public.weld_records.operator_cert_valid_until  IS 'Validade do certificado EN 14730-2 do soldador aluminotérmico';
COMMENT ON COLUMN public.weld_records.operator_cert_entity        IS 'Entidade emissora do certificado do soldador (ex: IP, ADIF)';
COMMENT ON COLUMN public.weld_records.operator_cert_standard      IS 'Norma de qualificação do soldador (ex: NP EN 14730-2)';
COMMENT ON COLUMN public.weld_records.ut_cert_ref                 IS 'Referência do certificado UT do operador de ultrassons';
COMMENT ON COLUMN public.weld_records.ut_cert_valid_until         IS 'Validade do certificado EN ISO 9712 do operador UT';
COMMENT ON COLUMN public.weld_records.ut_cert_level               IS 'Nível de certificação UT: Nível 1, Nível 2 ou Nível 3';
COMMENT ON COLUMN public.weld_records.portion_ce_ref              IS 'Número de declaração CE do kit/porção aluminotérmica';
COMMENT ON COLUMN public.weld_records.approval_body_ref           IS 'Referência da aprovação por organismo notificado (NoBo/DeBo)';


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 2. materials — Marcação CE, DoP, ficha técnica, grau de aço        │
-- │    EN 13674 (carril), EN 13481 (fixações), EN 13230 (travessas)    │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS ce_marking               boolean     NULL DEFAULT false,  -- Produto com Marcação CE
  ADD COLUMN IF NOT EXISTS ce_marking_ref           text        NULL,  -- Número/referência da Marcação CE
  ADD COLUMN IF NOT EXISTS declaration_of_performance_ref text  NULL,  -- Referência DoP/DPC (Declaração de Desempenho)
  ADD COLUMN IF NOT EXISTS mill_certificate_ref     text        NULL,  -- Ref. certificado de ensaio de fábrica (mill cert)
  ADD COLUMN IF NOT EXISTS steel_grade              text        NULL,  -- Grau do aço (R260, R350HT, R370CrHT, etc.)
  ADD COLUMN IF NOT EXISTS applicable_standard      text        NULL,  -- Norma de produto aplicável (EN 13674-1, etc.)
  ADD COLUMN IF NOT EXISTS technical_datasheet_ref  text        NULL,  -- Referência da ficha técnica aprovada
  ADD COLUMN IF NOT EXISTS country_of_origin        text        NULL,  -- País de fabrico
  ADD COLUMN IF NOT EXISTS manufacturer_ref         text        NULL;  -- Referência interna do fabricante

COMMENT ON COLUMN public.materials.ce_marking                    IS 'Produto com Marcação CE conforme Diretiva de Interoperabilidade';
COMMENT ON COLUMN public.materials.ce_marking_ref                IS 'Número de referência ou certificado da Marcação CE';
COMMENT ON COLUMN public.materials.declaration_of_performance_ref IS 'Referência da Declaração de Desempenho (DoP/DPC) — obrigatória para produtos de construção';
COMMENT ON COLUMN public.materials.mill_certificate_ref          IS 'Referência do certificado de ensaio emitido pela fábrica (mill test certificate)';
COMMENT ON COLUMN public.materials.steel_grade                   IS 'Grau do aço: R260, R350HT, R370CrHT para carril; classe betão para travessas';
COMMENT ON COLUMN public.materials.applicable_standard           IS 'Norma europeia de produto aplicável (ex: EN 13674-1, EN 13481-x, EN 13230)';
COMMENT ON COLUMN public.materials.technical_datasheet_ref       IS 'Referência da ficha técnica aprovada pela IP/Fiscalização';
COMMENT ON COLUMN public.materials.country_of_origin             IS 'País de fabrico do material (rastreabilidade)';
COMMENT ON COLUMN public.materials.manufacturer_ref              IS 'Referência interna do fabricante para rastreabilidade';


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 3. material_lots — certificação por lote entregue em obra           │
-- │    Rastreabilidade: lote → localização via PK de instalação         │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.material_lots
  ADD COLUMN IF NOT EXISTS mill_cert_ref            text        NULL,  -- Ref. certificado de fábrica deste lote
  ADD COLUMN IF NOT EXISTS dop_ref                  text        NULL,  -- Ref. DoP deste lote
  ADD COLUMN IF NOT EXISTS heat_number              text        NULL,  -- Número de corrida siderúrgica (heat/melt number)
  ADD COLUMN IF NOT EXISTS steel_grade              text        NULL,  -- Grau do aço deste lote (pode diferir do catálogo)
  ADD COLUMN IF NOT EXISTS manufacturing_date       date        NULL,  -- Data de fabrico
  ADD COLUMN IF NOT EXISTS country_of_origin        text        NULL,  -- País de fabrico deste lote
  ADD COLUMN IF NOT EXISTS pk_installation_start    text        NULL,  -- PK de início de instalação deste lote
  ADD COLUMN IF NOT EXISTS pk_installation_end      text        NULL,  -- PK de fim de instalação deste lote
  ADD COLUMN IF NOT EXISTS inspection_report_ref    text        NULL;  -- Ref. do relatório de inspecção de recepção

COMMENT ON COLUMN public.material_lots.mill_cert_ref          IS 'Referência do certificado de ensaio de fábrica para este lote específico';
COMMENT ON COLUMN public.material_lots.dop_ref                IS 'Referência da Declaração de Desempenho para este lote';
COMMENT ON COLUMN public.material_lots.heat_number            IS 'Número de corrida/fusão siderúrgica — rastreabilidade até à fábrica';
COMMENT ON COLUMN public.material_lots.steel_grade            IS 'Grau do aço confirmado no certificado (R260, R350HT, etc.)';
COMMENT ON COLUMN public.material_lots.manufacturing_date     IS 'Data de fabrico conforme certificado do lote';
COMMENT ON COLUMN public.material_lots.country_of_origin      IS 'País de fabrico deste lote conforme documentação de entrega';
COMMENT ON COLUMN public.material_lots.pk_installation_start  IS 'PK de início de instalação deste lote na via (rastreabilidade)';
COMMENT ON COLUMN public.material_lots.pk_installation_end    IS 'PK de fim de instalação deste lote na via (rastreabilidade)';
COMMENT ON COLUMN public.material_lots.inspection_report_ref  IS 'Referência do relatório de inspecção de recepção em obra';


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 4. worker_qualifications — norma, tipo e âmbito de qualificação    │
-- │    IP GR.PR.005, EN 14730-2, EN ISO 9712, EN ISO 3834              │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.worker_qualifications
  ADD COLUMN IF NOT EXISTS standard_ref             text        NULL,  -- Norma de qualificação (EN 14730-2, EN ISO 9712, etc.)
  ADD COLUMN IF NOT EXISTS qualification_type       text        NULL,  -- Tipo categorizado de qualificação
  ADD COLUMN IF NOT EXISTS scope                    text        NULL,  -- Âmbito: processos/tipos/materiais qualificados
  ADD COLUMN IF NOT EXISTS renewal_date             date        NULL,  -- Data de renovação prevista
  ADD COLUMN IF NOT EXISTS exam_entity              text        NULL,  -- Entidade que realizou o exame/avaliação
  ADD COLUMN IF NOT EXISTS training_hours           integer     NULL,  -- Horas de formação associadas
  ADD COLUMN IF NOT EXISTS ip_qualification_code    text        NULL;  -- Código de qualificação IP (GR.PR.005)

COMMENT ON COLUMN public.worker_qualifications.standard_ref          IS 'Norma aplicável: EN 14730-2 (soldador), EN ISO 9712 (UT), IP GR.PR.005 (segurança ferrovia), EN ISO 3834 (qualidade soldadura)';
COMMENT ON COLUMN public.worker_qualifications.qualification_type    IS 'Tipo: soldador_aluminotermico | operador_ut | operador_maquina_via | supervisor_qualidade | outro';
COMMENT ON COLUMN public.worker_qualifications.scope                 IS 'Âmbito da qualificação: processos aprovados, tipos de material, categorias de via';
COMMENT ON COLUMN public.worker_qualifications.renewal_date          IS 'Data de renovação prevista (normalmente a cada 2 anos para EN 14730-2)';
COMMENT ON COLUMN public.worker_qualifications.exam_entity           IS 'Entidade que realizou o exame de avaliação (IP, laboratório acreditado, etc.)';
COMMENT ON COLUMN public.worker_qualifications.training_hours        IS 'Número total de horas de formação realizadas';
COMMENT ON COLUMN public.worker_qualifications.ip_qualification_code IS 'Código atribuído pela IP no âmbito do GR.PR.005';


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ 5. Índices para consulta eficiente por campos de auditoria         │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_weld_cert_expiry
  ON public.weld_records (operator_cert_valid_until)
  WHERE operator_cert_valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weld_ut_cert_expiry
  ON public.weld_records (ut_cert_valid_until)
  WHERE ut_cert_valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_materials_ce
  ON public.materials (ce_marking)
  WHERE ce_marking IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_lots_heat
  ON public.material_lots (heat_number)
  WHERE heat_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workerqual_type
  ON public.worker_qualifications (qualification_type)
  WHERE qualification_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workerqual_renewal
  ON public.worker_qualifications (renewal_date)
  WHERE renewal_date IS NOT NULL;
