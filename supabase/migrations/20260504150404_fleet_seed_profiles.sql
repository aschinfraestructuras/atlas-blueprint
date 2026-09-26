-- Criar perfis Fleet para os utilizadores existentes
-- José = admin, outros = worker por defeito
INSERT INTO public.fleet_profiles (id, full_name, email, role, language, department, is_active)
VALUES
  ('4d4bd489-7cbd-449e-af76-d10ab456d6a3', 'José Antunes Martins',  'jantunes@aschinfraestructuras.com', 'admin',   'pt', 'Qualidade',  true),
  ('95af1634-6c78-4ccf-b775-0ee4777fba37', 'R. Arranz',              'rarranz@aschinfraestructuras.com',  'manager', 'es', 'Produção',   true),
  ('f2fd3f23-392a-42cd-a484-2d81a5167c1d', 'Info ASCH',              'info@aschquality.com',              'worker',  'pt', 'Admin',      true),
  ('17b8968d-76ba-45a1-b387-99576d213cc2', 'Utilizador Teste',       'quim_leiria@hotmail.com',           'worker',  'pt', 'Produção',   true),
  ('f2bb5ba7-ea4e-42f5-8b49-b91faa543b18', 'Utilizador Teste 2',     'lis.science@outlook.com',           'worker',  'pt', 'Produção',   false)
ON CONFLICT (id) DO UPDATE SET
  full_name  = EXCLUDED.full_name,
  role       = EXCLUDED.role,
  department = EXCLUDED.department,
  language   = EXCLUDED.language,
  is_active  = EXCLUDED.is_active;

-- Criar algumas viaturas de exemplo para testar
INSERT INTO public.fleet_vehicles (plate, brand, model, year, fuel_type, co2_factor, assigned_to, km_initial, is_active)
VALUES
  ('AA-00-BB', 'Volkswagen', 'Transporter', 2022, 'diesel',   2.6400, '4d4bd489-7cbd-449e-af76-d10ab456d6a3', 45000, true),
  ('CC-11-DD', 'Ford',       'Transit',     2021, 'diesel',   2.6400, '95af1634-6c78-4ccf-b775-0ee4777fba37', 38000, true),
  ('EE-22-FF', 'Toyota',     'Yaris',       2023, 'hybrid',   2.3100, '17b8968d-76ba-45a1-b387-99576d213cc2', 12000, true)
ON CONFLICT (plate) DO NOTHING;

-- Criar uma submissão de teste para Abril (para o dashboard mostrar dados)
INSERT INTO public.fleet_submissions (
  user_id, vehicle_id, reference_month,
  km_start, km_end, liters, cost_eur, notes, status
)
SELECT
  '4d4bd489-7cbd-449e-af76-d10ab456d6a3',
  v.id,
  '2026-04-01',
  45000, 45847, 62.30, 98.50,
  'Deslocações obra PF17A Setúbal',
  'submitted'
FROM public.fleet_vehicles v WHERE v.plate = 'AA-00-BB'
ON CONFLICT (user_id, vehicle_id, reference_month) DO NOTHING;

-- Submissão de Março (para o gráfico dos 6 meses)
INSERT INTO public.fleet_submissions (
  user_id, vehicle_id, reference_month,
  km_start, km_end, liters, cost_eur, notes, status
)
SELECT
  '4d4bd489-7cbd-449e-af76-d10ab456d6a3',
  v.id,
  '2026-03-01',
  44210, 45000, 57.80, 91.20,
  'Março — obra e reuniões Lisboa',
  'approved'
FROM public.fleet_vehicles v WHERE v.plate = 'AA-00-BB'
ON CONFLICT (user_id, vehicle_id, reference_month) DO NOTHING;

-- Confirmar
SELECT fp.full_name, fp.role, fp.department, fv.plate, fv.brand
FROM fleet_profiles fp
LEFT JOIN fleet_vehicles fv ON fv.assigned_to = fp.id
ORDER BY fp.role, fp.full_name;
