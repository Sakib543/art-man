"use client";

import { useRouter } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDateLong } from "@/lib/format";
import type { ReportDay } from "../queries";
import { reportHref, type ReportView } from "../view";

interface DaySelectProps {
  days: ReportDay[];
  selected: string;
  view: ReportView;
}

/**
 * Pick which business day's report to show. The date lives in the URL, so a
 * report can be bookmarked — and so does the view, which a new day keeps.
 */
export function DaySelect({ days, selected, view }: DaySelectProps) {
  const router = useRouter();

  return (
    <NativeSelect
      aria-label="Choose a business day"
      className="w-full sm:w-64"
      value={selected}
      onChange={(event) => router.push(reportHref(event.target.value, view))}
    >
      {days.map((day) => (
        <NativeSelectOption key={day.businessDate} value={day.businessDate}>
          {formatDateLong(day.businessDate)}
          {day.closed ? " (closed)" : " (open)"}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
