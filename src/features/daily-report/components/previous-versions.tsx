"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DayBill } from "@/db/queries/day-bills";
import { formatTime, num } from "@/lib/format";
import { editReason } from "../corrections";

/**
 * The versions of a bill before the Owner corrected it (P1.5). The day shows
 * one line, so this is where the rest of the story stays reachable: nothing is
 * hidden, only moved off the everyday view.
 */
export function PreviousVersions({ billNo, previous }: { billNo: number; previous: DayBill[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[12px] text-muted-foreground underline underline-offset-2"
        onClick={() => setOpen(true)}
      >
        {previous.length === 1 ? "See previous version" : `See ${previous.length} previous versions`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill #{billNo} before it was corrected</DialogTitle>
            <DialogDescription>
              Every version is still in the record, with its own bill number. The day&apos;s totals already account
              for them, because each one was reversed when it was replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            {previous.map((version) => (
              <div key={version.id} className="rounded-[10px] border px-3 py-2.5">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium tabular-nums">#{version.billNo}</p>
                  <p className="text-[12.5px] text-muted-foreground tabular-nums">{formatTime(version.createdAt)}</p>
                </div>

                <div className="mt-1.5 text-[13px]">
                  {version.lines.map((line, index) => (
                    <p key={index} className="flex justify-between gap-3">
                      <span>
                        {line.name} <Badge className="ml-1 bg-secondary text-muted-foreground">{line.staffName}</Badge>
                      </span>
                      <span className="tabular-nums">{num(line.amount)}</span>
                    </p>
                  ))}
                </div>

                <p className="mt-1.5 flex justify-between border-t pt-1.5 text-[13px] font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{num(version.total)}</span>
                </p>

                {editReason(version) ? (
                  <p className="mt-1.5 text-[12.5px] text-muted-foreground">Changed because: {editReason(version)}</p>
                ) : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
