"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { AlertCircle, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useReducer, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkPayment, paymentAmounts, priceCart, PricingError, type PayMode, type PricedLine } from "@/lib/accounting";
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
import { Badge } from "@/components/ui/badge";

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
  // Money off the bill (P3.10). Kept as typed text like the payment boxes, so a
  // half-typed number never becomes NaN on the way to the total.
  const [discountText, setDiscountText] = useState(editing?.discount ? String(editing.discount) : "");
  const [discountReason, setDiscountReason] = useState(editing?.discountReason ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const specialRates = customer.status === "found" ? customer.info.specialRates : NO_RATES;

  const catalog = useMemo(
    () => ({
      services: Object.fromEntries(data.services.map((s) => [s.id, { id: s.id, name: s.name, price: s.price, maxPrice: s.maxPrice }])),
      deals: Object.fromEntries(data.deals.map((d) => [d.id, d])),
      specialRates,
      // A re-opened bill's deals keep the split they were sold with (P3.14).
      dealSplits: editing?.dealSplits,
    }),
    [data, specialRates, editing],
  );
  const dealsById = catalog.deals;
  // The cart needs the full service, not the pricing one: a line with a range
  // shows its two ends under the name (P3.11).
  const servicesById = useMemo(() => Object.fromEntries(data.services.map((s) => [s.id, s])), [data.services]);

  const discount = toRupees(discountText);

  /**
   * Same pricing function the server uses, so the total shown is the total
   * saved — including how the discount is split across the lines.
   *
   * A discount bigger than the bill is priced twice on purpose: the cart is
   * priced without it so the screen keeps showing real figures, and the
   * message from the failed attempt is shown beside the field. Blanking the
   * whole bill because one number is too big would be a worse screen.
   */
  const { priced, subtotal, total, discountProblem, priceProblem } = useMemo(() => {
    const nothing = { priced: [] as PricedLine[], subtotal: 0, total: 0, discountProblem: "" };
    let gross;
    try {
      gross = priceCart(cart, catalog);
    } catch (error) {
      // An amount typed outside its range lands here (P3.11). Saying so beats
      // showing a total of Rs 0 with no explanation.
      return { ...nothing, priceProblem: error instanceof PricingError ? error.message : "" };
    }

    if (discount === 0) {
      return { priced: gross.lines, subtotal: gross.subtotal, total: gross.total, discountProblem: "", priceProblem: "" };
    }

    try {
      const net = priceCart(cart, catalog, discount);
      return { priced: net.lines, subtotal: net.subtotal, total: net.total, discountProblem: "", priceProblem: "" };
    } catch (error) {
      return {
        priced: gross.lines,
        subtotal: gross.subtotal,
        total: gross.total,
        discountProblem: error instanceof PricingError ? error.message : "That discount cannot be applied",
        priceProblem: "",
      };
    }
  }, [cart, catalog, discount]);

  const amounts = paymentAmounts(payMode, total, { cash: toRupees(typedCash), online: toRupees(typedOnline) });
  const payment = checkPayment(total, amounts.cash, amounts.online);

  function submit() {
    setError("");
    if (cart.length === 0) return setError("Add a service or deal to start the bill");
    if (cart.some((line) => !line.staffId)) return setError("Choose a staff member for every service");
    // Priced as 0 while blank so the total stays live; not saved that way (P3.12).
    if (cart.some((line) => line.serviceId === null && !line.amount)) return setError("Enter the amount for Other");
    if (customer.status === "new" && !customer.name.trim()) return setError("Enter the customer's name");
    if (editing && reason.trim().length < 3) return setError("Write what was wrong with the bill");
    if (priceProblem) return setError(priceProblem);
    if (discountProblem) return setError(discountProblem);
    if (discount > 0 && discountReason.trim().length < 3) return setError("Say why the discount is being given");
    if (!payment.ok) {
      return setError(
        payment.remaining > 0
          ? `Payment is ${rs(payment.remaining)} short of the total`
          : `Payment is ${rs(-payment.remaining)} more than the total`,
      );
    }

    const bill = {
      lines: cart.map(({ serviceId, staffId, dealId, dealInstanceId, amount, description }) => ({
        serviceId,
        staffId,
        dealId,
        dealInstanceId,
        // Checked against the range on the server; never taken on trust (P3.11).
        // On an Other line it is the price, which is the point of one (P3.12).
        amount,
        description: serviceId === null ? description.trim() || null : null,
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
      discount,
      discountReason: discount > 0 ? discountReason.trim() : null,
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
      setDiscountText("");
      setDiscountReason("");
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

        <Panel>
          <PanelHeader
            title={editing ? `Correcting bill #${editing.billNo}` : "New bill"}
            action={
              editing ? (
                <Link href="/billing" className="text-xs text-muted-foreground underline underline-offset-2">
                  Leave it as it is
                </Link>
              ) : (
                <Badge variant="brass" className="tabular-nums">
                  #{data.nextBillNo}
                </Badge>
              )
            }
          />

          {/* Filled in only when the bill was written on the paper book first (spec 5.5). */}
          <div className="flex items-center gap-2.5 border-b px-card py-2.5">
            <Label htmlFor="book-no" className="shrink-0 text-xs font-normal text-muted-foreground">
              Bill book no.
            </Label>
            <Input
              id="book-no"
              value={bookNo}
              onChange={(event) => setBookNo(event.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="Only for a paper bill"
              className="h-8 w-44 text-sm"
            />
          </div>

          <div className="border-b px-card py-4">
            <CustomerBox value={customer} onChange={setCustomer} />
          </div>

          <CartLines
            lines={cart}
            priced={priced}
            staff={data.staff}
            dealsById={dealsById}
            servicesById={servicesById}
            specialRates={specialRates}
            onStaff={(key, staffId) => dispatch({ type: "setStaff", key, staffId })}
            onAmount={(key, amount) => dispatch({ type: "setAmount", key, amount })}
            onDescription={(key, description) => dispatch({ type: "setDescription", key, description })}
            onAddOther={() => dispatch({ type: "addOther", key: crypto.randomUUID() })}
            onAllStaff={(staffId) => dispatch({ type: "setAllStaff", staffId })}
            onRemove={(key) => dispatch({ type: "remove", key })}
          />

          <div className="border-t px-card py-4">
            {priceProblem ? (
              <p role="alert" className="mb-1.5 text-xs text-destructive">
                {priceProblem}
              </p>
            ) : null}
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Items</span>
              <span className="tabular-nums">{cart.length}</span>
            </div>
            {discount > 0 && !discountProblem ? (
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{rs(subtotal)}</span>
              </div>
            ) : null}

            {/* Money off the bill (P3.10). The Manager may give one as well as
                the Owner — the client's decision of 2026-09-23. */}
            <div className="flex items-center justify-between gap-2.5 py-1">
              <Label htmlFor="discount" className="font-normal text-muted-foreground">
                Discount (Rs)
              </Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={discountText}
                onChange={(event) => setDiscountText(event.target.value)}
                placeholder="0"
                className="h-8 w-28 text-right tabular-nums"
              />
            </div>

            {discountProblem ? (
              <p role="alert" className="py-1 text-xs text-destructive">
                {discountProblem}
              </p>
            ) : null}

            {discount > 0 ? (
              <Input
                aria-label="Why the discount is being given"
                value={discountReason}
                onChange={(event) => setDiscountReason(event.target.value)}
                maxLength={120}
                placeholder="Why? e.g. regular customer"
                className="mt-1 h-8 text-sm"
              />
            ) : null}

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
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Bill #{editing.billNo} is cancelled and a reversal is added, then this bill is saved with a new
                  number. All three stay in the day&apos;s record.
                </p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <Button size="lg" className="mt-3.5 w-full" onClick={submit} disabled={pending}>
              <ReceiptIcon aria-hidden />
              {pending
                ? "Saving..."
                : editing
                  ? `Save correction${total ? ` ${rs(total)}` : ""}`
                  : `Save bill${total ? ` ${rs(total)}` : ""}`}
            </Button>
          </div>
        </Panel>
      </div>

      <ReceiptDialog receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </>
  );
}
