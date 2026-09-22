import { Search } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuditPage, PAGE_SIZE } from "@/features/developer/queries";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, num } from "@/lib/format";

export const metadata = { title: "Audit log | Art Men's Salon" };

interface Params {
  q?: string;
  page?: string;
}

/** `before` / `after` are free-form JSON. Show them, do not try to interpret them. */
function Payload({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <details className="text-[12.5px]">
      <summary className="cursor-pointer text-muted-foreground">{label}</summary>
      <pre className="mt-1 max-w-full overflow-x-auto rounded-md bg-secondary p-2 font-mono text-[11.5px]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRole("developer");
  const { q = "", page } = await searchParams;
  const { rows, total, page: current, pages } = await getAuditPage(q, Number(page) || 1);

  const pageHref = (n: number) => `/developer/audit-log?${new URLSearchParams(q ? { q, page: String(n) } : { page: String(n) })}`;

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every recorded action, newest first">
        <Badge variant="secondary">{num(total)} entries</Badge>
      </PageHeader>

      <form method="get" className="mb-4 flex max-w-md items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by who, what or which record"
          aria-label="Search the audit log"
          className="h-10"
        />
        <Button type="submit" variant="outline" className="h-10">
          <Search aria-hidden />
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-[13.5px] text-muted-foreground">
          {q ? `Nothing matches "${q}".` : "Nothing has been recorded yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border bg-card">
          <table className="w-full text-[13px]">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-3.5 py-2.5 font-medium whitespace-nowrap">When</th>
                <th className="px-3.5 py-2.5 font-medium">Who</th>
                <th className="px-3.5 py-2.5 font-medium">Action</th>
                <th className="px-3.5 py-2.5 font-medium">Record</th>
                <th className="px-3.5 py-2.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 align-top">
                  <td className="px-3.5 py-2.5 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3.5 py-2.5">{row.actor}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="font-mono text-[12px]">{row.action}</span>
                    {row.success ? null : (
                      <Badge variant="destructive" className="ml-2">
                        failed
                      </Badge>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] break-all">{row.target ?? "—"}</td>
                  <td className="px-3.5 py-2.5 min-w-[220px]">
                    <Payload label="before" value={row.before} />
                    <Payload label="after" value={row.after} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center gap-3 text-[13px]">
          {current > 1 ? (
            <Link href={pageHref(current - 1)} className="underline underline-offset-4">
              Newer
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Page {current} of {pages} · {PAGE_SIZE} per page
          </span>
          {current < pages ? (
            <Link href={pageHref(current + 1)} className="underline underline-offset-4">
              Older
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
