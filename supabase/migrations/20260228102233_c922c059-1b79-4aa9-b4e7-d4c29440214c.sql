
-- ═══════════════════════════════════════════════════════════════
-- TOPOGRAPHY MODULE – Equipment, Calibrations, Requests, Controls
-- ═══════════════════════════════════════════════════════════════

-- A) Equipamentos Topográficos
CREATE TABLE public.topography_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  equipment_type text NOT NULL DEFAULT 'estacao_total',
  brand text,
  model text,
  serial_number text,
  responsible text,
  status text NOT NULL DEFAULT 'active',
  current_location text,
  calibration_valid_until date,
  calibration_status text NOT NULL DEFAULT 'valid',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, code)
);

ALTER TABLE public.topography_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topo_eq_select" ON public.topography_equipment FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_eq_insert" ON public.topography_equipment FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_eq_update" ON public.topography_equipment FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_eq_delete" ON public.topography_equipment FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER set_topo_eq_updated_at BEFORE UPDATE ON public.topography_equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B) Certificados & Calibrações
CREATE TABLE public.equipment_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.topography_equipment(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  certifying_entity text NOT NULL,
  certificate_number text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  document_id uuid REFERENCES public.documents(id),
  approved_by uuid,
  status text NOT NULL DEFAULT 'valid',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topo_cal_select" ON public.equipment_calibrations FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_cal_insert" ON public.equipment_calibrations FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_cal_update" ON public.equipment_calibrations FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_cal_delete" ON public.equipment_calibrations FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER set_topo_cal_updated_at BEFORE UPDATE ON public.equipment_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C) Pedidos de Topografia
CREATE TABLE public.topography_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  work_item_id uuid REFERENCES public.work_items(id),
  zone text,
  description text NOT NULL,
  request_type text NOT NULL DEFAULT 'implantacao',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  priority text NOT NULL DEFAULT 'normal',
  responsible text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.topography_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topo_req_select" ON public.topography_requests FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_req_insert" ON public.topography_requests FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_req_update" ON public.topography_requests FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_req_delete" ON public.topography_requests FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER set_topo_req_updated_at BEFORE UPDATE ON public.topography_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- D) Registos de Controlo Geométrico
CREATE TABLE public.topography_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.topography_equipment(id),
  zone text,
  element text NOT NULL,
  tolerance text,
  measured_value text,
  deviation text,
  result text NOT NULL DEFAULT 'conforme',
  execution_date date NOT NULL DEFAULT CURRENT_DATE,
  technician text,
  ppi_id uuid REFERENCES public.ppi_instances(id),
  test_id uuid REFERENCES public.test_results(id),
  nc_id uuid REFERENCES public.non_conformities(id),
  work_item_id uuid REFERENCES public.work_items(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.topography_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topo_ctrl_select" ON public.topography_controls FOR SELECT USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_ctrl_insert" ON public.topography_controls FOR INSERT WITH CHECK (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_ctrl_update" ON public.topography_controls FOR UPDATE USING (is_project_member(auth.uid(), project_id));
CREATE POLICY "topo_ctrl_delete" ON public.topography_controls FOR DELETE USING (is_project_admin(auth.uid(), project_id));

CREATE TRIGGER set_topo_ctrl_updated_at BEFORE UPDATE ON public.topography_controls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- AUTO-UPDATE calibration_status on equipment
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_update_equipment_calibration_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- After insert/update on equipment_calibrations, update parent equipment
  UPDATE public.topography_equipment
  SET calibration_valid_until = NEW.valid_until,
      calibration_status = CASE
        WHEN NEW.valid_until < CURRENT_DATE THEN 'expired'
        WHEN NEW.valid_until < (CURRENT_DATE + interval '30 days') THEN 'expiring_soon'
        ELSE 'valid'
      END
  WHERE id = NEW.equipment_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calibration_update_equipment
  AFTER INSERT OR UPDATE ON public.equipment_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_equipment_calibration_status();

-- ═══════════════════════════════════════════════════════════════
-- CALIBRATION BLOCK – Prevent controls with expired equipment
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_check_equipment_calibration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cal_status text;
  v_valid_until date;
BEGIN
  SELECT calibration_status, calibration_valid_until
  INTO v_cal_status, v_valid_until
  FROM public.topography_equipment
  WHERE id = NEW.equipment_id;

  -- Also check real-time expiration
  IF v_valid_until IS NOT NULL AND v_valid_until < CURRENT_DATE THEN
    v_cal_status := 'expired';
    -- Auto-update the status
    UPDATE public.topography_equipment
    SET calibration_status = 'expired'
    WHERE id = NEW.equipment_id;
  END IF;

  IF v_cal_status = 'expired' OR v_cal_status IS NULL THEN
    RAISE EXCEPTION 'Equipamento com calibração inválida. Atualizar certificado antes de registar medições. (equipment_id: %)', NEW.equipment_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_calibration_before_control
  BEFORE INSERT ON public.topography_controls
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_equipment_calibration();

-- Audit log action additions
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check CHECK (
  action IN (
    'INSERT', 'UPDATE', 'DELETE',
    'BULK_SAVE', 'BULK_MARK_OK', 'LINK_NC', 'ARCHIVE',
    'status_change', 'STATUS_CHANGE',
    'EXPORT', 'LOGIN', 'LOGOUT',
    'APPROVE', 'REJECT', 'SUBMIT', 'REOPEN',
    'MEMBER_ADDED', 'INVITE_CREATED', 'INVITE_ACCEPTED',
    'ROLE_CHANGED', 'MEMBER_REMOVED', 'NEW_VERSION',
    'CALIBRATION_BLOCKED', 'CALIBRATION_UPDATED'
  )
);
