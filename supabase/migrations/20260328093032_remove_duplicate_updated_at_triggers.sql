-- profiles: dois triggers updated_at — remover o mais antigo
-- trg_profiles_updated_at vs update_profiles_updated_at
-- Manter trg_profiles_updated_at (nome mais consistente com o padrão do projecto)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- non_conformities: dois triggers updated_at — remover o mais antigo
-- nc_updated_at vs update_non_conformities_updated_at
-- Manter update_non_conformities_updated_at (nome mais explícito)
DROP TRIGGER IF EXISTS nc_updated_at ON public.non_conformities;
