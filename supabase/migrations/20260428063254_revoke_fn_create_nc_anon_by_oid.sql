-- Revogar por OID para garantir que apanha ambos os overloads
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN 
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    WHERE p.proname = 'fn_create_nc'
      AND p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.fn_create_nc(%s) FROM PUBLIC', rec.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.fn_create_nc(%s) TO authenticated', rec.args);
    RAISE NOTICE 'Revoked anon from fn_create_nc(%)', rec.args;
  END LOOP;
END $$;
