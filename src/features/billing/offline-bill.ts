import type { PricedLine, Rupees } from "@/lib/accounting";
import { ENTRY_VERSION, type OutboxBill, type OutboxEntry } from "@/lib/offline/outbox";
import type { OfflineReceipt } from "./types";

/**
 * A bill made with no server (backlog P2.2d), turned into what the outbox
 * keeps and the receipt the customer is handed. Pure — the billing screen
 * gathers the pieces, this only puts them together — so the slip and the
 * queued bill cannot disagree about a single line.
 */

export interface OfflineBillParts {
  clientId: string;
  /** The day it is made on, and so the only day the server will take it into (P2.2c). */
  businessDate: string;
  /** The offline copy's version it was priced with, or null without one. */
  catalogVersion: string | null;
  madeBy: string;
  /** Now, as an ISO string. */
  madeAt: string;
  /** What the server will be sent: `bookNo` already holds the slip's number. */
  bill: OutboxBill;
  /** The same cart priced in the browser, by the same `priceCart` the server uses. */
  priced: { lines: PricedLine[]; subtotal: Rupees; discount: Rupees; total: Rupees };
  staffNames: Record<string, string>;
  customerName: string | null;
}

/** The outbox entry and the receipt of one offline bill. */
export function offlineBill(parts: OfflineBillParts): { entry: OutboxEntry; receipt: OfflineReceipt } {
  const { bill, priced, staffNames, customerName } = parts;
  const lines = priced.lines.map((line) => ({
    name: line.name,
    staffName: (line.staffId && staffNames[line.staffId]) || "",
    amount: line.amount,
  }));

  const entry: OutboxEntry = {
    v: ENTRY_VERSION,
    clientId: parts.clientId,
    businessDate: parts.businessDate,
    catalogVersion: parts.catalogVersion,
    madeAt: parts.madeAt,
    madeBy: parts.madeBy,
    bill,
    preview: { customerName, lines, total: priced.total },
    rejected: null,
  };

  const receipt: OfflineReceipt = {
    slipNo: bill.bookNo ?? "",
    createdAt: parts.madeAt,
    businessDate: parts.businessDate,
    customerName,
    lines,
    subtotal: priced.subtotal,
    discount: priced.discount,
    total: priced.total,
    cash: bill.cash,
    online: bill.online,
    bookNo: bill.bookNo,
  };

  return { entry, receipt };
}
