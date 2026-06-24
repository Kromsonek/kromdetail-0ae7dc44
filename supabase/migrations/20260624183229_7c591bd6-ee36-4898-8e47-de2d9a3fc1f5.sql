
-- Tabela kodów rabatowych zarządzanych przez admina
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent', -- 'percent' lub 'amount'
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses integer, -- NULL = bez limitu
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Tylko admin może zarządzać (kodów się nie listuje publicznie)
CREATE POLICY "Admins manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Walidacja kodu (anon + zalogowany) - zwraca dane tylko jeśli kod jest poprawny
CREATE OR REPLACE FUNCTION public.validate_discount_code(_code text)
RETURNS TABLE(valid boolean, discount_type text, discount_value numeric, message text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.discount_codes%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.discount_codes WHERE code = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Kod nie istnieje'::text; RETURN;
  END IF;
  IF NOT _row.is_active THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Kod nieaktywny'::text; RETURN;
  END IF;
  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Kod wygasł'::text; RETURN;
  END IF;
  IF _row.max_uses IS NOT NULL AND _row.uses_count >= _row.max_uses THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, 'Kod został wyczerpany'::text; RETURN;
  END IF;
  RETURN QUERY SELECT true, _row.discount_type, _row.discount_value, 'OK'::text;
END; $$;

GRANT EXECUTE ON FUNCTION public.validate_discount_code(text) TO anon, authenticated;

-- Zliczanie użycia kodu przy składaniu zamówienia
CREATE OR REPLACE FUNCTION public.redeem_discount_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.discount_codes%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.discount_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND OR NOT _row.is_active THEN RETURN false; END IF;
  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN RETURN false; END IF;
  IF _row.max_uses IS NOT NULL AND _row.uses_count >= _row.max_uses THEN RETURN false; END IF;
  UPDATE public.discount_codes SET uses_count = uses_count + 1, updated_at = now() WHERE id = _row.id;
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.redeem_discount_code(text) TO anon, authenticated;
