import { CANCELLATION_ALERT_AT } from "@/lib/alerts";
import { formatDate, rs } from "@/lib/format";

export type AlertTone = "warn" | "info" | "good";

export interface Alert {
  id: string;
  tone: AlertTone;
  text: string;
}

export interface AlertInput {
  cancelledToday: number;
  /** The most recent Day Close, if there has been one. */
  lastClose: { businessDate: string; difference: number; reason: string | null } | null;
  /** Wrong PIN attempts recorded in the last 24 hours. */
  wrongPins24h: number;
}

/** What the Owner should look at, most important first. Empty when all is well. */
export function buildAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];

  if (input.cancelledToday >= CANCELLATION_ALERT_AT) {
    alerts.push({
      id: "cancellations",
      tone: "warn",
      text: `${input.cancelledToday} bills cancelled today. That is a lot: check the reason given for each.`,
    });
  } else if (input.cancelledToday > 0) {
    alerts.push({
      id: "cancellations",
      tone: "info",
      text: `${input.cancelledToday} bill${input.cancelledToday === 1 ? "" : "s"} cancelled today. A reason is recorded for each.`,
    });
  }

  const close = input.lastClose;
  if (close && close.difference < 0) {
    alerts.push({
      id: "short",
      tone: "warn",
      text: `Cash was short ${rs(-close.difference)} at the close of ${formatDate(close.businessDate)}${close.reason ? `: ${close.reason}` : ""}.`,
    });
  } else if (close && close.difference > 0) {
    alerts.push({
      id: "extra",
      tone: "info",
      text: `Cash was ${rs(close.difference)} extra at the close of ${formatDate(close.businessDate)}${close.reason ? `: ${close.reason}` : ""}.`,
    });
  }

  if (input.wrongPins24h > 0) {
    alerts.push({
      id: "pins",
      tone: input.wrongPins24h >= 3 ? "warn" : "info",
      text: `${input.wrongPins24h} wrong PIN attempt${input.wrongPins24h === 1 ? "" : "s"} in the last 24 hours.`,
    });
  }

  return alerts;
}
