import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const codeSchema = z.object({ code: z.string().min(1).max(64) });

export const validateDiscountCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("validate_discount_code", {
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row ?? { valid: false, message: "Kod nieprawidłowy", discount_type: null, discount_value: null };
  });

export const redeemDiscountCodeFn = createServerFn({ method: "POST" })
  .inputValidator((data) => codeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("redeem_discount_code", {
      _code: data.code,
    });
    if (error) throw new Error(error.message);
    return Boolean(ok);
  });