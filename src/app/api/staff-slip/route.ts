import type { NextRequest } from "next/server";
import { getSlipData } from "@/features/staff-khata/queries";
import { slipQuerySchema } from "@/features/staff-khata/schemas";
import { buildSlip, slipFileName } from "@/features/staff-khata/slip";
import { renderSlipPdf } from "@/features/staff-khata/slip-pdf";
import { PAY_TYPE_LABEL, paysCommission, paysDailyWage, paysSalary } from "@/lib/accounting";
import { checkUser } from "@/lib/auth/session";
import { formatMonth, karachiDate, previousMonth } from "@/lib/business-date";
import { formatDate, formatDateTime } from "@/lib/format";

/**
 * A staff member's salary slip for one month, as a PDF to download (backlog
 * P3.3). The client's words: a file for the karigar's proof, and nothing else
 * — it is not sent anywhere.
 *
 * `GET /api/staff-slip?staff=<id>&month=2026-09`. Any signed-in role may have
 * one: the Manager keeps the khata and hands the slip over, and it shows
 * nothing the Staff khata screen does not. Reading only, so no Origin check
 * is needed (`lib/same-origin.ts` is for the Route Handlers that write). It
 * holds a person's pay, so no cache may keep it.
 */
const NO_STORE = { "Cache-Control": "no-store" };

/** A refusal the screen shows as it is, in words. */
const refuse = (status: number, message: string) =>
  new Response(message, { status, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(request: NextRequest) {
  const check = await checkUser();
  if (!check.ok) {
    return check.refused === "signed-out"
      ? refuse(401, "Sign in again to download the slip.")
      : refuse(503, "The system is under maintenance.");
  }

  const parsed = slipQuerySchema.safeParse({
    staff: request.nextUrl.searchParams.get("staff"),
    month: request.nextUrl.searchParams.get("month"),
  });
  if (!parsed.success) return refuse(400, parsed.error.issues[0]?.message ?? "Choose a staff member and a month.");
  const { staff: staffId, month } = parsed.data;

  const data = await getSlipData(staffId, month);
  if (!data) return refuse(404, "There is no such staff member, or no business day in that month.");

  const slip = buildSlip(month, data.lines);
  const { payType, commissionRate } = data.staff;
  const commission = paysCommission(payType);

  const pdf = await renderSlipPdf(slip, {
    salonName: "Art Men's Salon",
    staffName: data.staff.name,
    payType: `${PAY_TYPE_LABEL[payType]}${commission ? ` (${commissionRate}%)` : ""}`,
    monthLabel: formatMonth(month),
    previousMonthLabel: formatMonth(previousMonth(month)),
    closedOn: data.closedAt ? formatDate(karachiDate(data.closedAt)) : null,
    work: commission || slip.totals.commission !== 0 ? data.work : null,
    paysCommission: commission,
    paysWage: paysDailyWage(payType),
    paysSalary: paysSalary(payType),
    // The time only, never who: a slip made by the developer must not name the role (HANDOFF section 6).
    generatedAt: formatDateTime(new Date()),
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      ...NO_STORE,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slipFileName(data.staff.name, month)}"`,
    },
  });
}
