import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  type: "package" | "service";
  name: string;
  price: number;
};

export type AppliedCode = {
  code: string;
  discount_type: "percent" | "amount";
  discount_value: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  subtotal: number;
  discount: number;
  codeDiscount: number;
  appliedCode: AppliedCode | null;
  applyCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  clearCode: () => void;
  total: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("kd-cart");
    if (raw) try { setItems(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("kd-cart", JSON.stringify(items)); }, [items]);

  const add = (item: CartItem) => setItems((prev) => (prev.find((p) => p.id === item.id) ? prev : [...prev, item]));
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const clear = () => { setItems([]); setAppliedCode(null); };

  const subtotal = items.reduce((s, i) => s + Number(i.price), 0);
  // -10% przy 3+ usługach (tylko gdy są usługi custom, nie liczymy pakietów do progu)
  const serviceCount = items.filter((i) => i.type === "service").length;
  const discount = serviceCount >= 3 ? Math.round(items.filter((i) => i.type === "service").reduce((s, i) => s + Number(i.price), 0) * 0.1 * 100) / 100 : 0;
  const afterDiscount = subtotal - discount;
  const codeDiscount = appliedCode
    ? appliedCode.discount_type === "percent"
      ? Math.round(afterDiscount * (Number(appliedCode.discount_value) / 100) * 100) / 100
      : Math.min(afterDiscount, Number(appliedCode.discount_value))
    : 0;
  const total = Math.max(0, afterDiscount - codeDiscount);

  const applyCode = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { ok: false, message: "Wpisz kod" };
    try {
      const { data, error } = await supabase.rpc("validate_discount_code", { _code: trimmed });
      if (error) return { ok: false, message: error.message };
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.valid) return { ok: false, message: row?.message || "Kod nieprawidłowy" };
      setAppliedCode({ code: trimmed, discount_type: row.discount_type as "percent" | "amount", discount_value: Number(row.discount_value) });
      return { ok: true, message: "Kod zastosowany" };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Błąd walidacji kodu" };
    }
  };
  const clearCode = () => setAppliedCode(null);

  return (
    <Ctx.Provider value={{ items, add, remove, clear, open, setOpen, subtotal, discount, codeDiscount, appliedCode, applyCode, clearCode, total }}>
      {children}
    </Ctx.Provider>
  );
}
export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
