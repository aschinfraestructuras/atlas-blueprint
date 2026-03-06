-- Generate next lot code for material reception
CREATE OR REPLACE FUNCTION public.fn_next_lot_code(
  p_project_id uuid,
  p_material_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq int;
  v_code text;
BEGIN
  SELECT count(*) + 1
    INTO v_seq
    FROM material_lots
   WHERE project_id = p_project_id
     AND material_id IN (SELECT id FROM materials WHERE project_id = p_project_id AND code = p_material_code);

  v_code := p_material_code || '-L' || lpad(v_seq::text, 3, '0');
  RETURN v_code;
END;
$$;