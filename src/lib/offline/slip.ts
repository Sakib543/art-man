/**
 * The number on a customer's slip before the bill has a real one (P2.2d).
 *
 * A bill made offline gets its `bill_no` only when it reaches the server, so
 * its receipt carries a temporary number instead — `T-5` — counted from 1 on
 * each business day (the client's choice, 2026-09-29; the slip carries the
 * date). It is stored in `bills.book_no`, the column that already holds the
 * paper bill book's number (P2.1): both are the number on the slip a customer
 * was handed while the system could not give one. A bill with a paper book
 * number keeps that number and gets no `T-` number, so a slip has one number.
 *
 * Pure.
 */

const TEMP = /^T-\d+$/;

export const tempNo = (n: number): string => `T-${n}`;

/** Is this book number one the app gave an offline bill, rather than one written on paper? */
export const isTempNo = (bookNo: string): boolean => TEMP.test(bookNo);

/** How a bill's slip number is shown beside it: "Offline T-5", or "Book B-2/45" for the paper book. */
export function slipLabel(bookNo: string | null): string | null {
  if (!bookNo) return null;
  return isTempNo(bookNo) ? `Offline ${bookNo}` : `Book ${bookNo}`;
}
