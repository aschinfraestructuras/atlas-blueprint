-- Corrigir search_path em todas as funções criadas hoje
CREATE OR REPLACE FUNCTION fn_auto_weld_codes()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_seq integer; v_proj text;
BEGIN
  SELECT COALESCE(code,'PF17A') INTO v_proj FROM public.projects WHERE id=NEW.project_id LIMIT 1;
  IF NEW.code IS NULL OR NEW.code='' THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.weld_records WHERE project_id=NEW.project_id AND code LIKE 'FS-%';
    NEW.code := 'FS-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  IF NEW.has_ut=true AND (NEW.fus_code IS NULL OR NEW.fus_code='') THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(fus_code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.weld_records WHERE project_id=NEW.project_id AND fus_code IS NOT NULL;
    NEW.fus_code := 'FUS-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION fn_auto_ata_code()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_seq integer; v_proj text;
BEGIN
  SELECT COALESCE(code,'PF17A') INTO v_proj FROM public.projects WHERE id=NEW.project_id LIMIT 1;
  IF NEW.status='approved' AND (NEW.ata_code IS NULL OR NEW.ata_code='') THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(ata_code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.hp_notifications WHERE project_id=NEW.project_id AND ata_code IS NOT NULL;
    NEW.ata_code := 'ATA-Q-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION fn_auto_rdc_code()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_seq integer; v_proj text;
BEGIN
  SELECT COALESCE(code,'PF17A') INTO v_proj FROM public.projects WHERE id=NEW.project_id LIMIT 1;
  IF NEW.rdc_code IS NULL OR NEW.rdc_code='' THEN
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(rdc_code,'[^0-9]','','g'),'') AS integer)),0)+1
    INTO v_seq FROM public.plan_controlled_copies WHERE project_id=NEW.project_id AND rdc_code IS NOT NULL;
    NEW.rdc_code := 'RDC-' || v_proj || '-' || LPAD(v_seq::text,3,'0');
  END IF;
  RETURN NEW;
END $$;
