"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { AlertCircle, CheckCircle2, LoaderCircle, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { unstable_isUnrecognizedActionError, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useReducer, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestDayRefresh } from "@/components/day-sync";
import { useConnectivity } from "@/components/use-connectivity";
import { checkPayment, paymentAmounts, priceCart, PricingError, type PayMode, type PricedLine } from "@/lib/accounting";
import { formatDate, formatDateTime, paidBy, rs } from "@/lib/format";
import type { OutboxBill, OutboxEntry } from "@/lib/offline/outbox";
import { offlineTrust, trustRefusal } from "@/lib/offline/session";
import { tempNo } from "@/lib/offline/slip";
import { nextTempNo, queueBill, readCatalog, readOutboxEntry, removeFromOutbox } from "@/lib/offline/store";
import { createBillAction, editBillAction, findSavedBillAction, lookupCustomerAction } from "../actions";
import { payModeOf } from "../bill-draft";
import { cartReducer } from "../cart-state";
import { offlineBill } from "../offline-bill";
import { draftOfEntry } from "../outbox-draft";
import type { BillDraft, BillingData, OfflineReceipt, Receipt, SavedBill } from "../types";
import { CartLines } from "./cart-lines";
import { CustomerBox, type CustomerState } from "./customer-box";
import { PaymentBox } from "./payment-box";
import { ReceiptDialog } from "./receipt-dialog";
import { ServicePicker } from "./service-picker";
import { Badge } from "@/components/ui/badge";

/** A stable empty object, so memoised prices do not recompute on every render. */
const NO_RATES: Record<string, number> = {};

const toRupees =(text: string) => Math.max(0, Math.trunc(Number(text) || 0));

/**
 * How often to ask "did it arrive?" after a Save lost its answer (P3.15). Not
 * at once: a request cut off on the way back may still be finishing on the
 * server, and asking too early would say "not saved" a moment before it is.
 */
const ASK_EVERY_MS = 4_000;

const OUTDATED =
  "The app was updated while this screen was open, so this bill was not saved. Reload the page (F5) and save it again.";

/** The bill being corrected, when the Owner opened one from Today's bills (P1.4). */
type Editing = Extract<BillDraft, { ok: true }>;

/**
 * One Save, exactly as it was sent, kept while its answer is in doubt (P3.15)
 * so that it can go to the outbox as it was — not as the cart looks after the
 * counter has touched it since (P2.2d).
 */
interface Sent {
  bill: Omit<OutboxBill, "bookNo"> & { bookNo: string };
  priced: { lines: PricedLine[]; subtotal: number; discount: number; total: number };
  customerName: string | null;
}

export function BillingScreen({
  data,
  editing,
  fixing,
  offlineOnly = false,
}: {
  data: BillingData;
  editing?: Editing | null;
  /** The id of a bill made offline and refused by the server, opened to be put right (P2.2c). */
  fixing?: string | null;
  /**
   * The offline screen (P2.2d): the catalog came from this computer's copy,
   * and every bill goes to the outbox, whatever the connection says.
   */
  offlineOnly?: boolean;
}) {
  const router = useRouter();
  const online = useConnectivity();
  // With no internet a bill is kept on this computer for the server (P2.2d).
  const offline = offlineOnly || !online;
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
  // Said once a Save has worked out, e.g. after an answer was lost (P3.15).
  const [notice, setNotice] = useState("");
  // The id this bill is sent under (P3.15). It stays the same until the server
  // is known to have the bill, so Save can be pressed again without ever
  // making a second one.
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  // A bill whose Save lost its answer: it may or may not have been saved.
  // Null when nothing is in doubt.
  const [doubtful, setDoubtful] = useState<Sent | null>(null);
  const [receipt, setReceipt] = useState<Receipt | OfflineReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // The refused offline bill being put right (P2.2c), once read from the
  // outbox; "gone" when it is not waiting for attention any more.
  const [fix, setFix] = useState<OutboxEntry | "gone" | null>(null);

  /*
   * Open a refused offline bill on the screen, as the counter made it (P2.2c).
   * It keeps its id, so however it ends up saved — from here, or by a send of
   * it that was still on its way — it is saved once. Only a bill waiting for a
   * person is opened: one back in line belongs to the sync.
   */
  useEffect(() => {
    if (!fixing) return;
    let cancelled = false;

    void (async () => {
      const entry = await readOutboxEntry(fixing).catch(() => null);
      if (cancelled) return;
      if (!entry?.rejected) return setFix("gone");

      const draft = draftOfEntry(entry);
      dispatch({ type: "load", lines: draft.lines });
      setPayMode(draft.payMode);
      setTypedCash(draft.typedCash);
      setTypedOnline(draft.typedOnline);
      setBookNo(draft.bookNo);
      setDiscountText(draft.discountText);
      setDiscountReason(draft.discountReason);
      setClientId(entry.clientId);
      setFix(entry);

      // The customer as the server knows them now — their visits and any
      // special rate — or, for a number it has never seen, as typed.
      const typed = entry.bill.customer;
      if (!typed) return;
      let known = null;
      try {
        const result = await lookupCustomerAction({ phone: typed.phone });
        if (result.ok) known = result.data;
      } catch {
        // Not reachable just now: the number as typed will do.
      }
      if (cancelled) return;
      setCustomer(
        known
          ? { status: "found", info: known }
          : { status: "new", phone: typed.phone, name: typed.name ?? entry.preview.customerName ?? "" },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [fixing]);

  const fixed = fix === "gone" ? null : fix;

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

  /**
   * The server has the bill — from this Save, from an earlier one whose answer
   * was lost, or found by asking (P3.15). Show its receipt and start the next
   * bill under a new id.
   */
  function afterSave({ receipt: saved, alreadySaved }: SavedBill, note?: string) {
    setClientId(crypto.randomUUID());
    setDoubtful(null);
    // The offline copy of the day should have this bill if the internet goes next (P2.2e).
    requestDayRefresh();
    if (editing) {
      // The bill just edited is now cancelled, so this screen has nothing
      // left to show. Go back to a fresh bill; the correction is at the top
      // of Today's bills.
      router.push("/billing");
      router.refresh();
      return;
    }

    if (fixed) {
      // The refused offline bill is in the books now: off the outbox and out
      // of "Needs attention" (P2.2c). If this fails, the list still shows it,
      // and Send again or Remove then finds it saved — nothing is lost.
      removeFromOutbox(fixed.clientId).catch((error) => console.warn("Could not clear the outbox entry", error));
      setFix(null);
      // Back to a plain new bill, without a navigation that would take the
      // receipt below off the screen with it.
      window.history.replaceState(null, "", "/billing");
    }

    setNotice(note ?? (alreadySaved ? `Bill #${saved.billNo} had already been saved, so it was not saved twice.` : ""));
    setReceipt(saved);
    setReceiptOpen(true);
    startNextBill();
  }

  /** An empty screen for the next customer, once the last bill is safe. */
  function startNextBill() {
    dispatch({ type: "clear" });
    setCustomer({ status: "none" });
    setPayMode("cash");
    setTypedCash("");
    setTypedOnline("");
    setBookNo("");
    setDiscountText("");
    setDiscountReason("");
  }

  /**
   * Keep a bill on this computer for the server (P2.2d): into the outbox, with
   * a `T-` number on the customer's slip, and on to the next customer. It keeps
   * the id it has, so if a Save of it did reach the server after all, the sync
   * is answered with that bill and no second one is made (P3.15).
   *
   * Only within 12 hours of the server last confirming the sign-in; after that
   * the counter is sent to the paper bill book.
   */
  async function keep(sent: Sent) {
    try {
      const stored = await readCatalog().catch(() => null);
      const trust = offlineTrust(stored?.savedAt ?? null, Date.now());
      if (!trust.ok) return setError(trustRefusal(trust));
      if (!stored) return setError(trustRefusal({ ok: false, reason: "no-copy" }));

      // One number per slip: a bill first written in the paper book keeps
      // that book's number and gets no `T-` number.
      const slipNo = sent.bill.bookNo.trim() || tempNo(await nextTempNo(data.businessDate));
      const { entry, receipt: slip } = offlineBill({
        clientId,
        businessDate: data.businessDate,
        catalogVersion: stored.version,
        madeBy: stored.user.username,
        madeAt: new Date().toISOString(),
        bill: { ...sent.bill, bookNo: slipNo },
        priced: sent.priced,
        staffNames: Object.fromEntries(data.staff.map((member) => [member.id, member.name])),
        customerName: sent.customerName,
      });
      await queueBill(entry);

      setClientId(crypto.randomUUID());
      setDoubtful(null);
      setNotice(
        `No internet: bill ${slip.slipNo} is kept on this computer and goes to the server by itself when the internet is back.`,
      );
      setReceipt(slip);
      setReceiptOpen(true);
      startNextBill();
    } catch (error) {
      console.error(error);
      setError("This computer could not keep the bill. Write it in the paper bill book.");
    }
  }

  /** The server's answer to "did it arrive?" (P3.15). */
  const onAnswer = useEffectEvent((found: Receipt | null) => {
    if (found) {
      afterSave(
        { receipt: found, alreadySaved: true },
        `The connection dropped, but bill #${found.billNo} had reached the server and is saved. Do not save it again.`,
      );
      // The Save's own answer, which would have refreshed Today's bills, was lost.
      router.refresh();
      return;
    }
    setDoubtful(null);
    setError("The connection dropped before the bill reached the server, so it was not saved. Press Save to send it again.");
  });

  const onOutdated = useEffectEvent(() => {
    setDoubtful(null);
    setError(OUTDATED);
  });

  /*
   * While a Save's answer is missing, ask the server every few seconds whether
   * the bill arrived, until it can say (P3.15). A failed ask means the
   * connection is still down; the next tick tries again.
   */
  useEffect(() => {
    if (doubtful === null) return;
    let stopped = false;
    let asking = false;

    async function ask() {
      if (asking) return;
      asking = true;
      try {
        const result = await findSavedBillAction({ clientId });
        if (!stopped && result.ok) onAnswer(result.data);
      } catch (error) {
        if (!stopped && unstable_isUnrecognizedActionError(error)) onOutdated();
      } finally {
        asking = false;
      }
    }

    const timer = setInterval(() => void ask(), ASK_EVERY_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [doubtful, clientId]);

  function submit() {
    setError("");
    setNotice("");
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
        // Checked above: every line has one.
        staffId: staffId!,
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
    const sent: Sent = {
      bill,
      priced: { lines: priced, subtotal, discount, total },
      customerName:
        customer.status === "found" ? customer.info.name : customer.status === "new" ? customer.name.trim() : null,
    };

    if (offline) {
      // A correction cancels a saved bill, and a refused bill has to be put
      // right against the server's books: neither can wait in the outbox.
      if (editing) return setError("Correcting a bill needs the internet.");
      if (fixed) return setError("Putting right a refused bill needs the internet.");
      startTransition(() => keep(sent));
      return;
    }

    startTransition(async () => {
      let result;
      try {
        result = editing
          ? await editBillAction({ ...bill, clientId, billId: editing.id, reason: reason.trim() })
          : await createBillAction({ ...bill, clientId });
      } catch (error) {
        // A screen from before the latest deploy: the server does not know
        // this Save any more, so it never ran. Only a reload fixes that.
        if (unstable_isUnrecognizedActionError(error)) return setError(OUTDATED);
        // The browser itself says there is no network: the Save never left
        // this computer, so there is nothing to wait for — keep it (P2.2d).
        // Even if it had left, the outbox sends it under the same id.
        if (!navigator.onLine && !editing && !fixed) return keep(sent);
        // Anything else is a lost connection. The request may have reached
        // the server and only the answer been lost on the way back, so keep
        // the cart and ask (P3.15) — never let the screen fall over, which is
        // what used to happen, with the cart and the answer both gone.
        return setDoubtful(sent);
      }
      if (!result.ok) return setError(result.error);
      afterSave(result.data);
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
            title={
              editing
                ? `Correcting bill #${editing.billNo}`
                : fixed
                  ? "Putting right a bill made offline"
                  : "New bill"
            }
            action={
              editing || fixed ? (
                <Link href="/billing" className="text-xs text-muted-foreground underline underline-offset-2">
                  Leave it as it is
                </Link>
              ) : offline ? (
                // No bill number can be promised offline: it comes on sync.
                <Badge variant="warning">Offline</Badge>
              ) : (
                <Badge variant="brass" className="tabular-nums">
                  #{data.nextBillNo}
                </Badge>
              )
            }
          />

          {/* The refused offline bill on the screen, and what it was refused for (P2.2c). */}
          {fixed ? (
            <div
              role="note"
              className="space-y-1 border-b border-warning-line bg-warning-soft px-card py-3 text-sm text-warning"
            >
              <p>
                Made offline {formatDateTime(fixed.madeAt)} and refused by the server: {fixed.rejected?.reason}
              </p>
              <p>
                The customer paid {rs(fixed.bill.cash + fixed.bill.online)} (
                {paidBy(fixed.bill.cash, fixed.bill.online).toLowerCase()}).{" "}
                {total !== fixed.bill.cash + fixed.bill.online ? (
                  <strong className="font-semibold">This bill now comes to {rs(total)}. </strong>
                ) : null}
                Put right what is wrong and save it: it goes once into the open day, {formatDate(data.businessDate)}.
              </p>
            </div>
          ) : fix === "gone" ? (
            <p role="status" className="border-b bg-surface-sunken px-card py-3 text-sm text-muted-foreground">
              That offline bill is not waiting for attention any more: it was sent, removed, or put back in line.
              This is a new bill.
            </p>
          ) : null}

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
            {/*
              The box keeps the number being typed in its own state, which
              resetting `customer` never reached — so the last bill's number
              stayed in it and the next one was typed onto the end (P3.16).
              Keyed on the bill's id, it starts empty exactly when a bill is
              saved and the next begins, and not when a Save is only in doubt.
            */}
            <CustomerBox key={clientId} value={customer} onChange={setCustomer} offline={offline} />
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

            {notice ? (
              <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {notice}
              </p>
            ) : null}

            {/* A Save that lost its answer (P3.15): say so, and keep asking. */}
            {doubtful !== null ? (
              <div
                role="status"
                className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-3 text-sm text-warning"
              >
                <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
                <div className="space-y-2">
                  <p>
                    The connection dropped before the answer came back, so it is not known yet whether this{" "}
                    {rs(doubtful.priced.total)} bill was saved. Checking with the server — do not save it again or
                    write it on paper until this clears.
                  </p>
                  {/*
                    The way on when the server stays out of reach (P2.2d): the
                    bill goes to the outbox under the id it was sent with, so
                    whether or not it arrived, it is saved exactly once.
                  */}
                  {!editing && !fixed ? (
                    <>
                      <p>
                        Or keep it on this computer and carry on: it goes to the server when the internet is back,
                        and is never saved twice.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => startTransition(() => keep(doubtful))}
                      >
                        Keep it for later and carry on
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <Button size="lg" className="mt-3.5 w-full" onClick={submit} disabled={pending || doubtful !== null}>
              <ReceiptIcon aria-hidden />
              {pending
                ? offline
                  ? "Keeping..."
                  : "Saving..."
                : doubtful !== null
                  ? "Checking whether it was saved..."
                  : editing
                    ? `Save correction${total ? ` ${rs(total)}` : ""}`
                    : offline
                      ? `Save offline${total ? ` ${rs(total)}` : ""}`
                      : `Save bill${total ? ` ${rs(total)}` : ""}`}
            </Button>
          </div>
        </Panel>
      </div>

      <ReceiptDialog receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </>
  );
}
