import type { MonthReport } from "@/lib/accounting";
import { formatDayMonth, num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClosedDayRow } from "../queries";

/** "-3,000" for a cost, "0" when there is none. */
const minus = (amount: number) => (amount ? `-${num(amount)}` : "0");

function Row({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <tr className={cn("border-b last:border-b-0", total && "bg-[#fbf8f3] font-semibold")}>
      <td className="px-[18px] py-2.5">{label}</td>
      <td className="px-[18px] py-2.5 text-right tabular-nums">{value}</td>
    </tr>
  );
}

export function ProfitAndLoss({ report }: { report: MonthReport }) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Profit and loss</h2>
      </div>
      <table className="w-full text-sm">
        <tbody>
          <Row label={`Total sales (sum of ${report.closedDays} closed day${report.closedDays === 1 ? "" : "s"})`} value={num(report.sales)} />
          <Row label="Daily expenses (from day close)" value={minus(report.dailyExpenses)} />
          <Row label="Fixed monthly expenses (rent, electricity, bills, supplies)" value={minus(report.fixed)} />
          <Row label="Other expenses (with reason)" value={minus(report.others)} />
          <Row label="Staff earnings from day close (commission, wage, bonus)" value={minus(report.staffEarned)} />
          <Row label="Monthly salaries (staff on a salary)" value={minus(report.salaries)} />
          <Row label="Net profit" value={rs(report.netProfit)} total />
        </tbody>
      </table>
      <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
        Staff advances and cash the Owner took are not expenses, so they are not subtracted here. Partner capital and its
        repayments are not expenses either (see Capital / Outstanding).
      </p>
    </div>
  );
}

export function OwnerAccountCard({ report }: { report: MonthReport }) {
  const { owner } = report;
  const ownerPaid = owner.reachedOwner - owner.netReachedOwner;

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Owner account</h2>
      </div>
      <table className="w-full text-sm">
        <tbody>
          <Row label="Net profit" value={num(report.netProfit)} />
          <Row label="Online payments received in Owner's bank" value={minus(report.online)} />
          <Row label="Cash taken from drawer" value={minus(owner.reachedOwner - report.online)} />
          {ownerPaid ? <Row label="Business costs the Owner paid himself (credited back)" value={`+${num(ownerPaid)}`} /> : null}
          <Row label="Capital repaid to partners (not an expense)" value={minus(report.capitalRepaid)} />
          <Row label="Balance with business" value={rs(owner.heldByBusiness)} total />
        </tbody>
      </table>
    </div>
  );
}

export function ClosedDaysTable({ days, report, openDay }: { days: ClosedDayRow[]; report: MonthReport; openDay: string | null }) {
  const th = "px-3.5 py-2 text-right text-[12.5px] font-medium text-muted-foreground";
  const td = "px-3.5 py-2.5 text-right tabular-nums";

  return (
    <div className="mt-4 rounded-[14px] border bg-card">
      <div className="flex items-center justify-between border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Closed days</h2>
        <span className="text-[12.5px] text-muted-foreground">From the Day close snapshot</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={cn(th, "text-left")}>Date</th>
              <th className={th}>Sale</th>
              <th className={th}>Cash</th>
              <th className={th}>Online</th>
              <th className={th}>Expenses</th>
              <th className={th}>Staff earned</th>
              <th className={th}>Staff paid</th>
              <th className={th}>Day profit</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.businessDate} className="border-b">
                <td className="px-3.5 py-2.5">{formatDayMonth(day.businessDate)}</td>
                <td className={td}>{num(day.sale)}</td>
                <td className={td}>{num(day.cash)}</td>
                <td className={td}>{num(day.online)}</td>
                <td className={td}>{num(day.expenses)}</td>
                <td className={td}>{num(day.staffEarned)}</td>
                <td className={cn(td, "text-muted-foreground")}>{num(day.staffPaid)}</td>
                <td className={cn(td, "font-medium", day.dayProfit < 0 && "text-destructive")}>{num(day.dayProfit)}</td>
              </tr>
            ))}
            {days.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No closed days in this month yet
                </td>
              </tr>
            ) : null}
            <tr className="bg-[#fbf8f3] font-semibold">
              <td className="px-3.5 py-2.5">Sum of {report.closedDays} days</td>
              <td className={td}>{num(report.sales)}</td>
              <td className={td}>{num(report.cash)}</td>
              <td className={td}>{num(report.online)}</td>
              <td className={td}>{num(report.dailyExpenses)}</td>
              <td className={td}>{num(report.staffEarned)}</td>
              <td className={td}>{num(report.staffPaid)}</td>
              <td className={td}>{num(report.dayProfitTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
        Sum of day profits {rs(report.dayProfitTotal)} − fixed {num(report.fixed)} − others {num(report.others)} − salaries{" "}
        {num(report.salaries)} = net profit {rs(report.netProfit)}.
        {openDay ? ` Today (${formatDayMonth(openDay)}) is added when the day is closed.` : ""}
      </p>
    </div>
  );
}
