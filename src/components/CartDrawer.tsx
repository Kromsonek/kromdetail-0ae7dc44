import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { X } from "lucide-react";
import { useState } from "react";
import { OrderForm } from "./OrderForm";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export function CartDrawer() {
  const { items, remove, open, setOpen, subtotal, discount, codeDiscount, appliedCode, applyCode, clearCode, total } = useCart();
  const [orderOpen, setOrderOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);
  const handleApply = async () => {
    setApplying(true);
    const res = await applyCode(codeInput);
    setApplying(false);
    if (res.ok) { toast.success(res.message); setCodeInput(""); }
    else toast.error(res.message);
  };
  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader><SheetTitle className="font-display text-2xl">Twój koszyk</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {items.length === 0 && <p className="text-sm text-muted-foreground">Koszyk jest pusty.</p>}
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                <div>
                  <p className="font-medium text-sm">{i.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{i.type === "package" ? "Pakiet" : "Usługa"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display">{Number(i.price).toFixed(0)} zł</span>
                  <button onClick={() => remove(i.id)} aria-label="Usuń"><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Suma</span><span>{subtotal.toFixed(0)} zł</span></div>
            {discount > 0 && <div className="flex justify-between text-[color:var(--gold)]"><span>Rabat -10%</span><span>-{discount.toFixed(0)} zł</span></div>}
            {items.length > 0 && (
              <div className="pt-2">
                {appliedCode ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10">
                    <div className="text-xs">
                      <div className="font-mono font-semibold">{appliedCode.code}</div>
                      <div className="text-muted-foreground">
                        {appliedCode.discount_type === "percent" ? `-${appliedCode.discount_value}%` : `-${appliedCode.discount_value} zł`}
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={clearCode}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="KROM-XXXX-XXXX-XXXX"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      className="font-mono text-xs h-9"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleApply} disabled={applying || !codeInput.trim()}>
                      {applying ? "..." : "Użyj"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {codeDiscount > 0 && <div className="flex justify-between text-[color:var(--gold)]"><span>Kod rabatowy</span><span>-{codeDiscount.toFixed(0)} zł</span></div>}
            <div className="flex justify-between font-display text-2xl pt-2"><span>Razem</span><span>{total.toFixed(0)} zł</span></div>
            <p className="text-xs text-center text-muted-foreground pt-1">💳 Każda forma płatności na miejscu</p>
            <label className="flex items-start gap-2 text-xs bg-muted/40 border rounded-md p-2 mt-2 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>Wyrażam zgodę, aby pracę detailingową wykonała <strong>osoba niepełnoletnia</strong> (wymagane).</span>
            </label>
            <Button disabled={items.length === 0 || !consent} className="w-full h-12 btn-gold mt-3" onClick={() => { setOpen(false); setOrderOpen(true); }}>
              Przejdź do realizacji
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <OrderForm open={orderOpen} onOpenChange={setOrderOpen} />
    </>
  );
}
