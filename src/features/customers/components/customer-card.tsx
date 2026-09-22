"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { editCustomerAction, removeRateAction, setRateAction } from "../actions";
import type { CustomerDetail, RateRow } from "../types";

/** Whole rupees only; an empty box reads as 0 rather than NaN. */
const toRupees = (value: string): number => (value.trim() === "" ? 0 : Number(value));

function EditDetails({ customer }: { customer: CustomerDetail }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);

  return (
    <>
      <Button variant="outline" className="h-9" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden />
        Edit details
      </Button>

      <FormDialog
        open={open}
        title="Edit customer"
        description="The name and the phone number are the only things that can be changed, and the change is recorded."
        onClose={() => setOpen(false)}
        onSubmit={() => editCustomerAction({ id: customer.id, name, phone })}
      >
        <Field label="Name" htmlFor="customer-name">
          <Input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} className="h-10" autoFocus />
        </Field>
        <Field label="Phone" htmlFor="customer-phone" hint="The counter looks a customer up by this number, so it must be unique.">
          <Input id="customer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10" />
        </Field>
      </FormDialog>
    </>
  );
}

function SetRate({ customer, row }: { customer: CustomerDetail; row: RateRow }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(row.price ?? row.listPrice));

  return (
    <>
      <Button variant="ghost" className="h-8 px-2 text-[12.5px]" onClick={() => setOpen(true)}>
        {row.price === null ? "Set rate" : "Change"}
      </Button>

      <FormDialog
        open={open}
        title={`${row.serviceName} for ${customer.name}`}
        description={`List price ${rs(row.listPrice)}. The special rate is what the bill charges, and commission follows the amount actually charged.`}
        submitLabel="Save rate"
        onClose={() => setOpen(false)}
        onSubmit={() => setRateAction({ customerId: customer.id, serviceId: row.serviceId, price: toRupees(price) })}
      >
        <Field label="Special price (Rs)" htmlFor="rate-price">
          <Input
            id="rate-price"
            type="number"
            min={0}
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="h-10"
            autoFocus
          />
        </Field>
      </FormDialog>
    </>
  );
}

function RemoveRate({ customer, row }: { customer: CustomerDetail; row: RateRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" className="h-8 px-2 text-[12.5px] text-destructive" onClick={() => setOpen(true)}>
        Remove
      </Button>

      <FormDialog
        open={open}
        title={`Remove the special rate?`}
        description={`${customer.name} would pay the list price of ${rs(row.listPrice)} for ${row.serviceName} from the next bill on.`}
        submitLabel="Remove rate"
        onClose={() => setOpen(false)}
        onSubmit={() => removeRateAction({ customerId: customer.id, serviceId: row.serviceId })}
      >
        <p className="text-sm text-muted-foreground">Bills already rung up are not changed.</p>
      </FormDialog>
    </>
  );
}

const th = "px-3.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground";
const td = "px-3.5 py-2.5";

/** One customer: their details, and a fixed price per service (backlog P3.2). */
export function CustomerCard({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b px-[18px] py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">{customer.name}</h2>
          <p className="text-[12.5px] text-muted-foreground tabular-nums">{customer.phone}</p>
        </div>
        <EditDetails customer={customer} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Service</th>
              <th className={cn(th, "text-right")}>List price</th>
              <th className={cn(th, "text-right")}>This customer pays</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {customer.rates.map((row) => (
              <tr key={row.serviceId} className="border-b">
                <td className={td}>{row.serviceName}</td>
                <td className={cn(td, "text-right tabular-nums text-muted-foreground")}>{rs(row.listPrice)}</td>
                <td className={cn(td, "text-right tabular-nums", row.price !== null && "font-medium text-warning")}>
                  {row.price === null ? "List price" : rs(row.price)}
                </td>
                <td className={cn(td, "text-right whitespace-nowrap")}>
                  <SetRate customer={customer} row={row} />
                  {row.price === null ? null : <RemoveRate customer={customer} row={row} />}
                </td>
              </tr>
            ))}

            {customer.rates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No active services. Add them in Staff &amp; rates.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
        A special rate applies automatically the next time this customer is billed. Bills already rung up never change.
      </p>
    </div>
  );
}
