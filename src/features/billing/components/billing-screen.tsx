"use client";

import { AlertCircle, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useReducer, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkPayment, paymentAmounts, priceCart, type PayMode, type PricedLine } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { createBillAction, editBillAction } from "../actions";
import { payModeOf } from "../bill-draft";
import { cartReducer } from "../cart-state";
import type { BillDraft, BillingData, Receipt } from "../types";
import { CartLines } from "./cart-lines";
import { CustomerBox, type CustomerState } from "./customer-box";
import { PaymentBox } from "./payment-box";
import { ReceiptDialog } from "./receipt-dialog";
import { ServicePicker } from "./service-picker";

/** A stable empty object, so memoised prices do not recompute on every render. */
const NO_RATES: Record<string, number> = {};

const toRupees =(text: string) => Math.max(0, Math.trunc(Number(text) || 0));

/** The bill being corrected, when the Owner opened one from Today's bills (P1.4). */
type Editing = Extract<BillDraft, { ok: true }>;

export function BillingScreen({ data, editing }: { data: BillingData; editing?: Editing | null }) {
  const router = useRouter();
  const startMode = editing ? payModeOf(editing.cash, editing.online) : "cash";

  const [cart, dispatch] = useReducer(cartReducer, editing?.lines ?? []);
  const [customer, setCustomer] = useState<CustomerState>(
    editing?.customer ? { status: "found", info: editing.customer } : { status: "none" },
  );
  const [payMode, setPayMode] = useState<PayMode>(startMode);
  const [typedCash, setTypedCash] = useState(editing && startMode === "split" ? String(editing.cash) : "");
  const [typedOnline, setTypedOnline] = useState(editing && startMode === "split" ? String(editing.online) : "");
  const [bookNo, setBookNo] = useState(editing?.bookNo ?? "");
  const [reason, setReason] = useState("");
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
    if (editing && reason.trim().length < 3) return setError("Write what was wrong with the bill");
    if (!payment.ok) {
      return setError(
        payment.remaining > 0
          ? `Payment is ${rs(payment.remaining)} short of the total`
          : `Payment is ${rs(-payment.remaining)} more than the total`,
      );
    }

    const bill = {
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
      bookNo,
    };

    startTransition(async () => {
      if (editing) {
        const result = await editBillAction({ ...bill, billId: editing.id, reason: reason.trim() });
        if (!result.ok) return setError(result.error);
        // The bill just edited is now cancelled, so this screen has nothing
        // left to show. Go back to a fresh bill; the correction is at the top
        // of Today's bills.
        router.push("/billing");
        return router.refresh();
      }

      const result = await createBillAction(bill);
      if (!result.ok) return setError(result.error);

      setReceipt(result.data);
      setReceiptOpen(true);
      dispatch({ type: "clear" });
      setCustomer({ status: "none" });
      setPayMode("cash");
      setTypedCash("");
      setTypedOnline("");
      setBookNo("");
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
            <h2 className="text-[15px] font-semibold">{editing ? `Correcting bill #${editing.billNo}` : "New bill"}</h2>
            {editing ? (
              <Link href="/billing" className="text-[12.5px] text-muted-foreground underline underline-offset-2">
                Leave it as it is
              </Link>
            ) : (
              <span className="text-muted-foreground tabular-nums">#{data.nextBillNo}</span>
            )}
          </div>

          {/* Filled in only when the bill was written on the paper book first (spec 5.5). */}
          <div className="flex items-center gap-2.5 border-b px-[18px] py-2.5">
            <Label htmlFor="book-no" className="shrink-0 text-[12.5px] font-normal text-muted-foreground">
              Bill book no.
            </Label>
            <Input
              id="book-no"
              value={bookNo}
              onChange={(event) => setBookNo(event.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Only for a paper bill"
              className="h-8 w-44 text-[13px]"
            />
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

            {editing ? (
              <div className="mt-3.5">
                <Label htmlFor="edit-reason" className="mb-1.5">
                  What was wrong?
                </Label>
                <Textarea
                  id="edit-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Required, e.g. wrong service picked"
                  rows={2}
                />
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                  Bill #{editing.billNo} is cancelled and a reversal is added, then this bill is saved with a new
                  number. All three stay in the day&apos;s record.
                </p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-[12.5px] text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <Button className="mt-3.5 h-11 w-full text-[15px]" onClick={submit} disabled={pending}>
              <ReceiptIcon aria-hidden />
              {pending
                ? "Saving..."
                : editing
                  ? `Save correction${total ? ` ${rs(total)}` : ""}`
                  : `Save bill${total ? ` ${rs(total)}` : ""}`}
            </Button>
          </div>
        </div>
      </div>

      <ReceiptDialog receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </>
  );
}
