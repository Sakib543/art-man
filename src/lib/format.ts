/** "Rs 1,200". Negative amounts (reversals) read "-Rs 500". */
export function rs(amount: number): string {
  const text = `Rs ${Math.abs(amount).toLocaleString("en-US")}`;
  return amount < 0 ? `-${text}` : text;
}

/** Plain number with thousands separators, for table columns. */
export const num = (amount: number): string => amount.toLocaleString("en-US");

/**
 * A service's price, or its range when it has one: "Rs 800" or "Rs 300 – 500"
 * (backlog P3.11). One function, so the billing tiles, the cart and the Staff
 * and rates list all write a range the same way.
 */
export function priceRange(price: number, maxPrice: number | null): string {
  return maxPrice === null || maxPrice <= price ? rs(price) : `${rs(price)} – ${num(maxPrice)}`;
}

/** "14:30" in Karachi time. The zone is fixed so server and browser always agree. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

/**
 * "21 Sep 2026, 14:30" in Karachi time. Use it for a stored timestamp — an
 * audit row, the moment a switch was flipped — where the date matters as much
 * as the time. Built from `formatDate` and `formatTime` so the wording matches
 * the rest of the app.
 */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  // "en-CA" gives YYYY-MM-DD, which is what formatDate expects.
  const isoDate = date.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  return `${formatDate(isoDate)}, ${formatTime(date.toISOString())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2026-09-21" -> "21 Sep" */
export function formatDayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-09-21" -> "21 Sep 2026" */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-09-21" -> "Monday, 21 September 2026" style long form. */
export function formatDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = DAYS[new Date(y, m - 1, d).getDay()];
  return `${weekday}, ${formatDate(isoDate)}`;
}

/**
 * How a bill was paid, for the two bill tables (P6.5, P6.6): "Cash" or
 * "Online" when it was one of them — the amount has its own column — and both
 * amounts on a split, where the column alone could not say how it divided.
 */
export function paidBy(cash: number, online: number): string {
  if (cash !== 0 && online !== 0) return `Cash ${num(cash)} · Online ${num(online)}`;
  if (online !== 0) return "Online";
  if (cash !== 0) return "Cash";
  return "—";
}
