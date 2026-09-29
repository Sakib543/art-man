"use client";

import { useMemo } from "react";
import { useOutbox } from "@/components/use-outbox";
import type { DayBill } from "@/db/queries/day-bills";
import { knownIds } from "@/lib/offline/day";
import { buildSheet, columnsFor, pendingBillsOf, type SheetStaff } from "../grid";
import { WorksheetGrid } from "./worksheet-grid";

/**
 * A day as the register (P6.4), with the bills made offline that are still
 * on this computer drawn in after the server's (P2.2e). Used by the Daily
 * report's Register view and by the offline register, which is drawn from the
 * offline copy of the day instead of the database.
 */
export function RegisterView({
  bills,
  staff,
  businessDate,
  standalone = false,
}: {
  bills: DayBill[];
  staff: SheetStaff[];
  businessDate: string;
  /** No summary cards above it: the offline register (P2.2e). */
  standalone?: boolean;
}) {
  const items = useOutbox();
  const known = useMemo(() => knownIds(bills), [bills]);
  const pending = pendingBillsOf(items, businessDate, known);
  const sheet = buildSheet(bills, columnsFor(staff, bills, pending), pending);
  return <WorksheetGrid sheet={sheet} standalone={standalone} />;
}
