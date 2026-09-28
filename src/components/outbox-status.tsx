"use client";

import { CloudUpload, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { outboxCounts } from "@/lib/offline/outbox";
import { useOutbox, useSyncSignedOut } from "./use-outbox";

const bills = (count: number) => (count === 1 ? "1 bill" : `${count} bills`);

/**
 * A line at the top of every signed-in screen while the outbox holds anything
 * (P2.2c): how many bills are waiting to be sent, and — louder — how many the
 * server refused, which need a person. It renders nothing when the outbox is
 * empty, which is almost always.
 *
 * On Billing the refused ones are listed in full ("Needs attention"), so only
 * the waiting line shows there.
 */
export function OutboxStatus() {
  const entries = useOutbox();
  const signedOut = useSyncSignedOut();
  const onBilling = usePathname() === "/billing";

  const { waiting, refused } = outboxCounts(entries);
  const showRefused = refused > 0 && !onBilling;
  if (waiting === 0 && !showRefused) return null;

  return (
    <div className="mb-4 space-y-2 print:hidden">
      {showRefused ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            {bills(refused)} made offline {refused === 1 ? "was" : "were"} refused by the server and{" "}
            {refused === 1 ? "needs" : "need"} attention.
          </p>
          <Link href="/billing" className="font-medium underline underline-offset-2">
            Open Billing
          </Link>
        </div>
      ) : null}

      {waiting > 0 ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-info-line bg-info-soft px-3.5 py-2.5 text-sm text-info"
        >
          <CloudUpload className="size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            {bills(waiting)} waiting to be sent to the server.{" "}
            {signedOut
              ? `Sign in again to send ${waiting === 1 ? "it" : "them"}.`
              : `${waiting === 1 ? "It goes" : "They go"} by ${waiting === 1 ? "itself" : "themselves"} as soon as the server can be reached.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
