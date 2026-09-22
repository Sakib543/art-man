"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useFormAction } from "@/components/use-form-action";
import { rs } from "@/lib/format";
import { editBillRowAction } from "../actions";
import { checkBillEdit, sumLines, type EditableLine } from "../bill-edit-rules";
import type { EditableBill } from "../queries";

interface Props {
  bill: EditableBill;
  staff: { id: string; name: string; active: boolean }[];
}

/** Whole rupees only; an empty box reads as 0 rather than NaN. */
const toRupees = (value: string): number => (value.trim() === "" ? 0 : Number(value));

export function BillEditForm({ bill, staff }: Props) {
  const router = useRouter();
  const [lines, setLines] = useState<EditableLine[]>(bill.lines);
  const [cash, setCash] = useState(String(bill.cash));
  const [online, setOnline] = useState(String(bill.online));
  const [bookNo, setBookNo] = useState(bill.bookNo ?? "");
  const [reason, setReason] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  const setLine = (id: string, patch: Partial<EditableLine>) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));

  const total = sumLines(lines);
  const paid = toRupees(cash) + toRupees(online);

  function submit(event: FormEvent) {
    event.preventDefault();
    const edit = { lines, cash: toRupees(cash), online: toRupees(online) };
    const problem = checkBillEdit(edit, bill.lines.map((line) => line.id));
    if (problem) return fail(problem);
    if (reason.trim().length < 3) return fail("Say why this bill is being changed.");

    run(
      () => editBillRowAction({ billNo: bill.billNo, ...edit, bookNo, reason }),
      bill.dayClosed
        ? `Bill #${bill.billNo} changed. The day was settled again and its security code has changed.`
        : `Bill #${bill.billNo} changed.`,
      () => {
        setReason("");
        router.refresh();
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="overflow-x-auto rounded-[14px] border bg-card">
        <table className="w-full text-[13px]">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-3.5 py-2.5 font-medium">Line</th>
              <th className="px-3.5 py-2.5 font-medium">Staff</th>
              <th className="px-3.5 py-2.5 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b last:border-0">
                <td className="px-3.5 py-2">
                  <Input
                    aria-label="Line name"
                    value={line.name}
                    onChange={(e) => setLine(line.id, { name: e.target.value })}
                    className="h-9"
                  />
                </td>
                <td className="px-3.5 py-2">
                  <NativeSelect
                    aria-label="Staff member"
                    value={line.staffId}
                    onChange={(e) => setLine(line.id, { staffId: e.target.value })}
                  >
                    {staff.map((member) => (
                      <NativeSelectOption key={member.id} value={member.id}>
                        {member.active ? member.name : `${member.name} (left)`}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </td>
                <td className="px-3.5 py-2">
                  <Input
                    aria-label="Amount"
                    inputMode="numeric"
                    value={String(line.amount)}
                    onChange={(e) => setLine(line.id, { amount: toRupees(e.target.value.replace(/[^\d-]/g, "")) })}
                    className="h-9 w-28 text-right font-mono"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="px-3.5 py-2.5 font-medium" colSpan={2}>
                Bill total
              </td>
              <td className="px-3.5 py-2.5 text-right font-mono font-medium">{rs(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cash" htmlFor="edit-cash">
          <Input
            id="edit-cash"
            inputMode="numeric"
            value={cash}
            onChange={(e) => setCash(e.target.value.replace(/[^\d]/g, ""))}
            className="h-10 text-right font-mono"
          />
        </Field>
        <Field label="Online" htmlFor="edit-online">
          <Input
            id="edit-online"
            inputMode="numeric"
            value={online}
            onChange={(e) => setOnline(e.target.value.replace(/[^\d]/g, ""))}
            className="h-10 text-right font-mono"
          />
        </Field>
        <Field label="Bill book no." htmlFor="edit-book" hint="Blank if there was no paper bill.">
          <Input id="edit-book" value={bookNo} onChange={(e) => setBookNo(e.target.value)} className="h-10" />
        </Field>
      </div>

      <p className={paid === total ? "text-[12.5px] text-muted-foreground" : "text-[12.5px] text-destructive"}>
        Paid {rs(paid)} against a total of {rs(total)}
        {paid === total ? "." : ` — these must match before the bill can be saved.`}
      </p>

      <Field label="Why is this being changed?" htmlFor="edit-reason" hint="Kept in the audit log with the old and new figures.">
        <Input
          id="edit-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. wrong price entered, customer paid Rs 900"
          className="h-10"
        />
      </Field>

      <FormFeedback error={error} done={done} />

      <Button type="submit" variant="destructive" className="h-10" disabled={pending}>
        {pending ? "Saving..." : "Change this bill"}
      </Button>
    </form>
  );
}
