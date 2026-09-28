import type { PayMode } from "@/lib/accounting";
import type { OutboxEntry } from "@/lib/offline/outbox";
import { payModeOf } from "./bill-draft";
import type { CartLine } from "./cart-state";

/**
 * A bill made offline and refused by the server, back on the billing screen
 * to be put right (P2.2c). Pure — it only reshapes what the outbox kept into
 * what the screen holds, so every field lands where the counter typed it.
 */
export interface OutboxDraft {
  lines: CartLine[];
  payMode: PayMode;
  /** As typed text, like the screen's own boxes; filled only for a split payment. */
  typedCash: string;
  typedOnline: string;
  bookNo: string;
  discountText: string;
  discountReason: string;
}

export function draftOfEntry(entry: OutboxEntry): OutboxDraft {
  const { bill } = entry;
  const payMode = payModeOf(bill.cash, bill.online);

  return {
    lines: bill.lines.map((line, index) => ({
      // Unique within the bill, whatever the lines are; a deal's lines still
      // hang together by `dealInstanceId`, which is kept as it was.
      key: `${entry.clientId}:${index}`,
      serviceId: line.serviceId,
      staffId: line.staffId,
      dealId: line.dealId,
      dealInstanceId: line.dealInstanceId,
      amount: line.amount,
      description: line.description ?? "",
    })),
    payMode,
    typedCash: payMode === "split" ? String(bill.cash) : "",
    typedOnline: payMode === "split" ? String(bill.online) : "",
    bookNo: bill.bookNo ?? "",
    discountText: bill.discount > 0 ? String(bill.discount) : "",
    discountReason: bill.discountReason ?? "",
  };
}
