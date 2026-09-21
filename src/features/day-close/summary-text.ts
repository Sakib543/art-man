import { formatDate, rs } from "@/lib/format";
import type { SnapshotRow } from "./types";

/** The daily summary sent to the Owner on WhatsApp. Sending is not connected yet; this is the preview. */
export function buildSummaryText(s: SnapshotRow): string {
  const outcome =
    s.difference < 0
      ? `Short ${rs(-s.difference)}: ${s.diffReason ?? "no reason given"}`
      : s.difference > 0
        ? `Extra ${rs(s.difference)}${s.diffReason ? `: ${s.diffReason}` : ""}`
        : "No difference";

  return [
    `Art Men's Salon: ${formatDate(s.businessDate)} closed`,
    `Sales ${rs(s.sale)} (cash ${rs(s.cash)}, online ${rs(s.online)})`,
    `Expenses ${rs(s.expenses)}`,
    `Day profit ${rs(s.dayProfit)}`,
    `Paid to staff ${rs(s.staffPaid)}`,
    `Expected ${rs(s.expectedCash)}, counted ${rs(s.countedCash)}`,
    outcome,
    `Cancelled bills: ${s.cancelledBills}`,
    `Security code ${s.securityCode}`,
  ].join("\n");
}
