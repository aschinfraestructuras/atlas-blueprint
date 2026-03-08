-- Drop the old overload of fn_create_ppi_instance (without p_inspection_date)
DROP FUNCTION IF EXISTS public.fn_create_ppi_instance(uuid, uuid, uuid, text, uuid, uuid, text);