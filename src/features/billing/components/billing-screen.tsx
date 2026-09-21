"use client";

import { AlertCircle, Receipt as ReceiptIcon } from "lucide-react";
import { useMemo, useReducer, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { checkPayment, paymentAmounts, priceCart, type PayMode, type PricedLine } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { createBillAction } from "../actions";
import { cartReducer } from "../cart-state";
import type { BillingData, Receipt } from "../types";
import { CartLines } from "./cart-lines";
import { CustomerBox, type CustomerState } from "./customer-box";
import { PaymentBox } from "./payment-box";
import { ReceiptDialog } from "./receipt-dialog";
import { ServicePicker } from "./service-picker";

/** A stable empty object, so memoised prices do not recompute on every render. */
const NO_RATES: Record<string, number> = {};

const toRupees =(text: string) => Math.max(0, Math.trunc(Number(text) || 0));

export function BillingScreen({ data }: { data: BillingData }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [customer, setCustomer] = useState<CustomerState>({ status: "none" });
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [typedCash, setTypedCash] = useState("");
  const [typedOnline, setTypedOnline] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const specialRates = customer.status === "found" ? customer.info.specialRates : NO_RATES;

  const catalog = useMemo(
    () => ({
      services: Object.fromEntries(data.services.map((s) => [s.id, { id: s.id, name: s.name, price: s.price }])),
      deals: Object.fromEntries(data.deals.map((d) => [d.id, d])),
      specialRates,
    }),
    [data, specialRates],
  );
  const dealsById = catalog.deals;

  // Same pricing function the server uses, so the total shown is the total saved.
  const { priced, total } = useMemo(() => {
    try {
      const result = priceCart(cart, catalog);
      return { priced: result.lines, total: result.total };
    } catch {
      return { priced: [] as PricedLine[], total: 0 };
    }
  }, [cart, catalog]);

  const amounts = paymentAmounts(payMode, total, { cash: toRupees(typedCash), online: toRupees(typedOnline) });
  const payment = checkPayment(total, amounts.cash, amounts.online);

  function submit() {
    setError("");
    if (cart.length === 0) return setError("Add a service or deal to start the bill");
    if (cart.some((line) => !line.staffId)) return setError("Choose a staff member for every service");
    if (customer.status === "new" && !customer.name.trim()) return setError("Enter the customer's name");
    if (!payment.ok) {
      return setError(
        payment.remaining > 0
          ? `Payment is ${rs(payment.remaining)} short of the total`
          : `Payment is ${rs(-payment.remaining)} more than the total`,
      );
    }

    startTransition(async () => {
      const result = await createBillAction({
        lines: cart.map(({ serviceId, staffId, dealId, dealInstanceId }) => ({
          serviceId,
          staffId,
          dealId,
          dealInstanceId,
        })),
        customer:
          customer.status === "found"
            ? { phone: customer.info.phone }
            : customer.status === "new"
              ? { phone: customer.phone, name: customer.name.trim() }
              : null,
        cash: amounts.cash,
        online: amounts.online,
      });

      if (!result.ok) return setError(result.error);

      setReceipt(result.data);
      setReceiptOpen(true);
      dispatch({ type: "clear" });
      setCustomer({ status: "none" });
      setPayMode("cash");
      setTypedCash("");
      setTypedOnline("");
    });
  }

  return (
    <>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <ServicePicker
          services={data.services}
          deals={data.deals}
          specialRates={specialRates}
          onAddService={(serviceId) => dispatch({ type: "addService", key: crypto.randomUUID(), serviceId })}
          onAddDeal={(deal) =>
            dispatch({ type: "addDeal", instanceId: crypto.randomUUID(), dealId: deal.id, serviceIds: deal.serviceIds })
          }
        />

        <div className="rounded-[14px] border bg-card">
          <div className="flex items-center justify-between border-b px-[18px] py-3.5">
            <h2 className="text-[15px] font-semibold">New bill</h2>
            <span className="text-muted-foreground tabular-nums">#{data.nextBillNo}</span>
          </div>

          <div className="border-b px-[18px] py-4">
            <CustomerBox value={customer} onChange={setCustomer} />
          </div>

          <CartLines
            lines={cart}
            priced={priced}
            staff={data.staff}
            dealsById={dealsById}
            onStaff={(key, staffId) => dispatch({ type: "setStaff", key, staffId })}
            onAllStaff={(staffId) => dispatch({ type: "setAllStaff", staffId })}
            onRemove={(key) => dispatch({ type: "remove", key })}
          />

          <div className="border-t px-[18px] py-4">
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Items</span>
              <span className="tabular-nums">{cart.length}</span>
            </div>
            <div className="mt-1.5 flex justify-between border-t pt-2.5 text-xl font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{rs(total)}</span>
            </div>

            <PaymentBox
              total={total}
              mode={payMode}
              onModeChange={setPayMode}
              cash={typedCash}
              online={typedOnline}
              onCashChange={setTypedCash}
              onOnlineChange={setTypedOnline}
            />

            {error ? (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-[12.5px] text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <Button className="mt-3.5 h-11 w-full text-[15px]" onClick={submit} disabled={pending}>
              <ReceiptIcon aria-hidden />
              {pending ? "Saving..." : `Save bill${total ? ` ${rs(total)}` : ""}`}
            </Button>
          </div>
        </div>
      </div>

      <ReceiptDialog receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </>
  );
}
