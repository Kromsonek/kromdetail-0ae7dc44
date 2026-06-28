REVOKE EXECUTE ON FUNCTION public.validate_discount_code(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_discount_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text) TO service_role;