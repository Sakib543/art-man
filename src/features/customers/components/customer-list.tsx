import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CustomerRow } from "../types";

/** The searchable list. A link per customer, so the choice survives a reload. */
export function CustomerList({ rows, selectedId, query, more }: { rows: CustomerRow[]; selectedId?: string; query: string; more: boolean }) {
  const href = (id: string) => `/customers?${new URLSearchParams(query ? { q: query, customer: id } : { customer: id })}`;

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Customers</h2>
      </div>

      <ul className="max-h-[560px] overflow-y-auto">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={href(row.id)}
              className={cn(
                "flex items-center justify-between gap-2 border-b px-[18px] py-3 text-sm hover:bg-secondary",
                row.id === selectedId && "bg-secondary font-medium",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate">{row.name}</span>
                <span className="block text-[12.5px] text-muted-foreground tabular-nums">{row.phone}</span>
              </span>
              {row.rates > 0 ? (
                <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[11.5px] text-warning">
                  {row.rates} special
                </span>
              ) : null}
            </Link>
          </li>
        ))}

        {rows.length === 0 ? <li className="px-[18px] py-8 text-center text-muted-foreground">No customer matches that</li> : null}
      </ul>

      {more ? (
        <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
          Showing the first 50. Search by name or phone number to narrow it down.
        </p>
      ) : null}
    </div>
  );
}
