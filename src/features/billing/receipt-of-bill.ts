import type { DayBill } from "@/db/queries/day-bills";
import type { Receipt } from "./types";

/**
 * A bill that is already saved, turned back into the receipt the counter can
 * print (backlog P3.6). Printing at the moment of sale is not enough on its
 * own: the printer may be out of paper, the print dialog may be cancelled, or
 * the customer may ask for the slip after the next bill has been started.
 *
 * It needs no query. `DayBill` already carries every field a receipt shows,
 * so Today's bills can reprint from the list it has already loaded.
 */
export function receiptOfBill(bill: DayBill, businessDate: string): Receipt {
  return {
    billNo: bill.billNo,
    createdAt: bill.createdAt,
    businessDate,
    customerName: bill.customerName,
    // `note` ("Special rate", "Deal share") is worked out while pricing a cart
    // and is never stored on the line, so it cannot be rebuilt from a saved
    // bill. The receipt does not print it, so the two paths still print alike.
    lines: bill.lines.map(({ name, amount, staffName }) => ({ name, amount, staffName, note: null })),
    // The lines are stored net of any discount, so the subtotal has to be put
    // back together from the two (P3.10). On a bill with no discount this is
    // the total, and the slip prints exactly as it did before.
    subtotal: bill.total + bill.discount,
    discount: bill.discount,
    // What the customer paid, not the sum of the lines: that is the figure the
    // bill was settled on, and a receipt must agree with the drawer.
    total: bill.total,
    cash: bill.cash,
    online: bill.online,
  };
}
