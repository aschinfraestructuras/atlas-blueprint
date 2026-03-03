
-- Update the blocking function (already existed but let's ensure correct logic)
CREATE OR REPLACE FUNCTION public.fn_check_calibration_before_control()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cal_status text;
  v_cal_valid date;
BEGIN
  SELECT calibration_status, calibration_valid_until
    INTO v_cal_status, v_cal_valid
    FROM public.topography_equipment
   WHERE id = NEW.equipment_id;

  IF v_cal_status = 'expired' OR (v_cal_valid IS NOT NULL AND v_cal_valid < CURRENT_DATE) THEN
    RAISE EXCEPTION 'Equipamento com calibração inválida. Atualize o certificado antes de registar medições.';
  END IF;
  RETURN NEW;
END;
$$;

-- Sync calibration to equipment on insert/update
CREATE OR REPLACE FUNCTION public.fn_sync_calibration_to_equipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_max_valid date;
  v_new_status text;
BEGIN
  SELECT MAX(valid_until) INTO v_max_valid
    FROM public.equipment_calibrations
   WHERE equipment_id = NEW.equipment_id;

  IF v_max_valid IS NULL THEN
    v_new_status := 'expired';
  ELSIF v_max_valid < CURRENT_DATE THEN
    v_new_status := 'expired';
  ELSIF v_max_valid <= (CURRENT_DATE + INTERVAL '30 days')::date THEN
    v_new_status := 'expiring_soon';
  ELSE
    v_new_status := 'valid';
  END IF;

  UPDATE public.topography_equipment
     SET calibration_valid_until = v_max_valid,
         calibration_status = v_new_status,
         updated_at = now()
   WHERE id = NEW.equipment_id;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_calibration_to_equipment') THEN
    CREATE TRIGGER trg_sync_calibration_to_equipment
      AFTER INSERT OR UPDATE ON public.equipment_calibrations
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_sync_calibration_to_equipment();
  END IF;
END $$;

-- Sync on delete
CREATE OR REPLACE FUNCTION public.fn_sync_calibration_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_max_valid date;
  v_new_status text;
BEGIN
  SELECT MAX(valid_until) INTO v_max_valid
    FROM public.equipment_calibrations
   WHERE equipment_id = OLD.equipment_id;

  IF v_max_valid IS NULL THEN
    v_new_status := 'expired';
  ELSIF v_max_valid < CURRENT_DATE THEN
    v_new_status := 'expired';
  ELSIF v_max_valid <= (CURRENT_DATE + INTERVAL '30 days')::date THEN
    v_new_status := 'expiring_soon';
  ELSE
    v_new_status := 'valid';
  END IF;

  UPDATE public.topography_equipment
     SET calibration_valid_until = v_max_valid,
         calibration_status = v_new_status,
         updated_at = now()
   WHERE id = OLD.equipment_id;

  RETURN OLD;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_calibration_on_delete') THEN
    CREATE TRIGGER trg_sync_calibration_on_delete
      AFTER DELETE ON public.equipment_calibrations
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_sync_calibration_on_delete();
  END IF;
END $$;
