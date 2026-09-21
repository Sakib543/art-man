"use client";

import { useRouter } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDateLong } from "@/lib/format";
import type { ReportDay } from "../queries";

interface DaySelectProps {
  days: ReportDay[];
  selected: string;
}

/** Pick which business day's report to show. The date lives in the URL, so a report can be bookmarked. */
export function DaySelect({ days, selected }: DaySelectProps) {
  const router = useRouter();

  return (
    <NativeSelect
      aria-label="Choose a business day"
      className="w-64"
      value={selected}
      onChange={(event) => router.push(`/daily-report?date=${event.target.value}`)}
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
