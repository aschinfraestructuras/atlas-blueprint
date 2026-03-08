CREATE OR REPLACE FUNCTION public.fn_work_item_report(p_work_item_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'work_item', (
      SELECT row_to_json(wi)
      FROM work_items wi
      WHERE wi.id = p_work_item_id
    ),
    'ppi_instances', (
      SELECT COALESCE(json_agg(json_build_object(
        'code',          pi.code,
        'template_name', COALESCE(pt.title, pi.code),
        'status',        pi.status,
        'items', (
          SELECT COALESCE(json_agg(json_build_object(
            'description', pii.label,
            'point_type',  COALESCE(pii.check_code, ''),
            'status',      pii.result,
            'observation', pii.notes
          ) ORDER BY pii.item_no), '[]'::json)
          FROM ppi_instance_items pii
          WHERE pii.instance_id = pi.id
        )
      )), '[]'::json)
      FROM ppi_instances pi
      LEFT JOIN ppi_templates pt ON pt.id = pi.template_id
      WHERE pi.work_item_id = p_work_item_id
        AND pi.is_deleted = false
    ),
    'test_results', (
      SELECT COALESCE(json_agg(json_build_object(
        'test_name',       tc.name,
        'standard',        tc.standard,
        'date',            tr.date,
        'result_status',   tr.result_status,
        'sample_ref',      tr.sample_ref,
        'laboratory_name', s.name,
        'report_number',   tr.report_number
      ) ORDER BY tr.date DESC), '[]'::json)
      FROM test_results tr
      JOIN tests_catalog tc ON tc.id = tr.test_id
      LEFT JOIN suppliers s ON s.id = tr.supplier_id
      WHERE tr.work_item_id = p_work_item_id
        AND tr.is_deleted = false
    ),
    'non_conformities', (
      SELECT COALESCE(json_agg(json_build_object(
        'code',     nc.code,
        'title',    COALESCE(nc.title, nc.description),
        'status',   nc.status,
        'severity', nc.severity,
        'due_date', nc.due_date
      ) ORDER BY nc.created_at DESC), '[]'::json)
      FROM non_conformities nc
      WHERE nc.work_item_id = p_work_item_id
        AND nc.is_deleted = false
    ),
    'materials', (
      SELECT COALESCE(json_agg(json_build_object(
        'material_name', m.name,
        'pame_status',   m.approval_status,
        'quantity',      wim.quantity,
        'unit',          wim.unit
      )), '[]'::json)
      FROM work_item_materials wim
      JOIN materials m ON m.id = wim.material_id
      WHERE wim.work_item_id = p_work_item_id
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_work_item_report(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_work_item_report(UUID) TO authenticated;