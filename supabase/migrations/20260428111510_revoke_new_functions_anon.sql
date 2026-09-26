-- fn_sup_eval_updated_at é trigger interna — revogar de PUBLIC completamente
REVOKE EXECUTE ON FUNCTION public.fn_sup_eval_updated_at() FROM PUBLIC;

-- fn_create_nc (2 overloads) ainda acessível por anon via DEFAULT PRIVILEGES
-- Revogar via DO loop para apanhar as assinaturas exactas
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    WHERE p.proname = 'fn_create_nc'
      AND p.pronamespace = 'public'::regnamespace
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.fn_create_nc(%s) FROM PUBLIC', rec.args);
      EXECUTE format('GRANT  EXECUTE ON FUNCTION public.fn_create_nc(%s) TO authenticated', rec.args);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;
