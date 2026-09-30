/**
 * The number on a customer's slip before the bill has a real one (P2.2d).
 *
 * A bill made offline gets its `bill_no` only when it reaches the server, so
 * its receipt carries a temporary number instead — `T-KXR-5` — counted from 1
 * on each business day (the client's choice, 2026-09-29; the slip carries the
 * date), with the computer's code in the middle (P7.10, QA-37): two computers
 * offline on one day used to hand out a `T-1` each. Slips kept before P7.10
 * read `T-5`, and still do.
 *
 * It is stored in `bills.book_no`, the column that already holds the paper
 * bill book's number (P2.1): both are the number on the slip a customer was
 * handed while the system could not give one. A bill with a paper book number
 * keeps that number and gets no `T-` number, so a slip has one number.
 *
 * Pure.
 */

const TEMP = /^T-(?:[A-Z]{3}-)?\d+$/;

/** The `n`th temporary number of the day on the computer with this code — `T-5` without one. */
export const tempNo = (n: number, deviceCode?: string): string => (deviceCode ? `T-${deviceCode}-${n}` : `T-${n}`);

/** Is this book number one the app gave an offline bill, rather than one written on paper? */
export const isTempNo = (bookNo: string): boolean => TEMP.test(bookNo);

/** How a bill's slip number is shown beside it: "Offline T-KXR-5", or "Book B-2/45" for the paper book. */
export function slipLabel(bookNo: string | null): string | null {
  if (!bookNo) return null;
  return isTempNo(bookNo) ? `Offline ${bookNo}` : `Book ${bookNo}`;
}

/**
 * The code of the refusal a Save gets when its book number is already on a
 * bill (P7.10, QA-28): the billing screen offers to save it anyway.
 */
export const SLIP_NO_REPEATED = "slip-no-repeated";

/**
 * A book number as two slips are compared (P7.10, QA-28): "b-2/45" and
 * "B-2 / 45" are the same slip, typed twice.
 */
export const slipKey = (bookNo: string): string => bookNo.toUpperCase().replace(/\s+/g, "");

/**
 * The slip numbers that more than one bill still in force carries (P7.10,
 * QA-28), by `slipKey`. A cancelled bill and its reversal do not count: a bill
 * corrected on the open day keeps its slip's number, and hands it on.
 */
export function repeatedSlipNos(bills: readonly { bookNo: string | null; status: string }[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const bill of bills) {
    if (!bill.bookNo || bill.status !== "active") continue;
    const key = slipKey(bill.bookNo);
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
  }
  return repeated;
}
