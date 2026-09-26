-- fn_create_nc tem 2 overloads — revogar ambos de PUBLIC, manter authenticated
REVOKE EXECUTE ON FUNCTION public.fn_create_nc(
  uuid,text,text,text,text,text,text,text,uuid,date,date,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_nc(
  uuid,text,text,text,text,text,text,text,uuid,date,date,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_create_nc(
  uuid,text,text,text,text,text,text,text,uuid,date,date,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_nc(
  uuid,text,text,text,text,text,text,text,uuid,date,date,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
) TO authenticated;

-- Também revogar as trigger functions que ficaram acessíveis a authenticated
REVOKE EXECUTE ON FUNCTION public.fn_set_risk_code()                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_set_technical_change_code()    FROM authenticated;
