-- Auto-criar perfil Fleet quando utilizador se regista via Auth
CREATE OR REPLACE FUNCTION public.fleet_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.fleet_profiles (id, full_name, email, role, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'pt')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Apenas criar trigger se não existir já um para fleet
DROP TRIGGER IF EXISTS fleet_on_auth_user_created ON auth.users;
CREATE TRIGGER fleet_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fleet_handle_new_user();

REVOKE EXECUTE ON FUNCTION public.fleet_handle_new_user() FROM PUBLIC;

-- Verificação final — confirmar todas as tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'fleet_%'
ORDER BY table_name;
