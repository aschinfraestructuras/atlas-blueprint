-- Adicionar configurações em falta para os novos doc_types
INSERT INTO public.document_signature_config (project_id, doc_type, slot_label, slot_order)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'training',     'Formador',              1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'training',     'Técnico de Qualidade',  2),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'audit',        'Auditor Líder',         1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'audit',        'Director de Obra',      2),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'daily_report', 'Encarregado',           1),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'daily_report', 'Director de Obra',      2)
ON CONFLICT DO NOTHING;
