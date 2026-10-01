"use client";

import { useRouter } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

interface MonthSelectProps {
  months: { month: string; label: string; closed: boolean }[];
  selected: string;
  /** The page to go to, e.g. "/monthly-report". The month goes in the URL as ?month=2026-09. */
  basePath: string;
  /** What else the page keeps in its URL, kept as it is when the month changes — Staff khata's `staff`. */
  query?: Record<string, string>;
}

/** Pick which month to look at. The month lives in the URL, so a page can be bookmarked. */
export function MonthSelect({ months, selected, basePath, query }: MonthSelectProps) {
  const router = useRouter();

  return (
    <NativeSelect
      aria-label="Choose a month"
      className="w-52"
      value={selected}
      onChange={(event) => router.push(`${basePath}?${new URLSearchParams({ ...query, month: event.target.value })}`)}
    >
      {months.map((choice) => (
        <NativeSelectOption key={choice.month} value={choice.month}>
          {choice.label}
          {choice.closed ? " (closed)" : ""}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
