"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { PasswordInput } from "@/components/password-input";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { requestDayRefresh } from "@/components/day-sync";
import { Segmented } from "@/components/segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useConnectivity } from "@/components/use-connectivity";
import type { PaidFrom } from "@/lib/accounting";
import { rs } from "@/lib/format";
import type { OutboxFolder } from "@/lib/offline/outbox";
import { offlineTrust, trustRefusal } from "@/lib/offline/session";
import { queueEntry, readCatalog } from "@/lib/offline/store";
import { addEntryAction } from "../actions";
import { folderEntryText, offlineEntryOf, offlineEntryProblem } from "../rows";
import type { StaffOption } from "../types";

type FormKind = "expense" | "staff_advance" | "owner_took" | "owner_added";

const KIND_LABEL: Record<FormKind, string> = {
  expense: "Expense",
  staff_advance: "Staff advance",
  owner_took: "Owner took cash",
  owner_added: "Owner added cash",
};

const PAID_FROM = [
  { value: "drawer", label: "Cash drawer" },
  { value: "owner", label: "Owner's pocket or bank" },
] as const;

const OUTDATED = "The app was updated while this screen was open, so this entry was not saved. Reload the page (F5) and save it again.";

/**
 * The Owner's own cash movements are confirmed with their PIN, which only the
 * server checks — so with no internet they cannot be made at all (the
 * client's answer, 2026-09-26). Staff PINs were removed.
 */
const isOwnerKind = (kind: FormKind) => kind === "owner_took" || kind === "owner_added";

export function EntryForm({
  staff,
  businessDate,
  offlineOnly = false,
}: {
  staff: StaffOption[];
  /** The day entries go into: the open day, or offline the day this computer last saw open. */
  businessDate: string;
  /** The offline page (P2.2e): every entry goes to the outbox, whatever the connection says. */
  offlineOnly?: boolean;
}) {
  const online = useConnectivity();
  // With no internet an entry is kept on this computer for the server (P2.2e).
  const offline = offlineOnly || !online;

  const [kind, setKind] = useState<FormKind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidFrom, setPaidFrom] = useState<PaidFrom>("drawer");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // The id this entry is sent under (P2.2e). It stays the same until the
  // server is known to have it, so Save can be pressed again — or the entry
  // kept offline — without ever making a second one.
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();

  const needsPin = isOwnerKind(kind);
  const ownerOffline = offline && needsPin;

  /** The entry is safe — on the server, or kept here for it: clear the form for the next one. */
  function startNext() {
    setClientId(crypto.randomUUID());
    setAmount("");
    setDescription("");
    setPin("");
  }

  /**
   * Keep the entry on this computer for the server (P2.2e): into the outbox,
   * in line with the bills, and on to the next one. It keeps the id it has,
   * so if a Save of it did reach the server after all, the sync is answered
   * "already saved" and no second one is made.
   *
   * Only within 12 hours of the server last confirming the sign-in.
   */
  async function keep(entry: OutboxFolder, lostAnswer = false) {
    try {
      const stored = await readCatalog().catch(() => null);
      const trust = offlineTrust(stored?.savedAt ?? null, Date.now());
      if (!trust.ok) return setError(trustRefusal(trust, "entry"));
      if (!stored) return setError(trustRefusal({ ok: false, reason: "no-copy" }, "entry"));

      const item = offlineEntryOf({
        clientId,
        businessDate,
        madeBy: stored.user.username,
        madeAt: new Date().toISOString(),
        entry,
        staffNames: Object.fromEntries(staff.map((member) => [member.id, member.name])),
      });
      await queueEntry(item);

      const what = `${folderEntryText(item)}, ${rs(entry.amount)}`;
      setNotice(
        lostAnswer
          ? `The connection dropped before the answer came back: ${what}, is kept on this computer and goes to the server by itself. It is never saved twice.`
          : `No internet: ${what}, is kept on this computer and goes to the server by itself when the internet is back.`,
      );
      startNext();
    } catch (thrown) {
      console.error(thrown);
      setError("This computer could not keep the entry. Write it down and enter it when the internet is back.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const value = Number(amount) || 0;
    // What the outbox can keep: never the Owner's own cash.
    const keepable: OutboxFolder | null =
      kind === "expense"
        ? { kind, amount: value, description, paidFrom }
        : kind === "staff_advance"
          ? { kind, amount: value, staffId }
          : null;

    // The server's own checks (`entrySchema`) on anything that may end up
    // kept — offline, or after a Save whose answer is lost: an entry the
    // server would refuse is better stopped here than found refused later.
    if (keepable) {
      const problem = offlineEntryProblem(keepable);
      if (problem) return setError(problem);
    }

    if (offline) {
      if (!keepable) {
        return setError(
          "The Owner's cash needs the internet: their PIN is checked by the server. Enter it when the internet is back.",
        );
      }
      startTransition(() => keep(keepable));
      return;
    }

    const payload = keepable ?? { kind, amount: value, description, pin };

    startTransition(async () => {
      let result;
      try {
        result = await addEntryAction({ ...payload, clientId });
      } catch (thrown) {
        // A screen from before the latest deploy: the server does not know
        // this Save any more, so it never ran. Only a reload fixes that.
        if (unstable_isUnrecognizedActionError(thrown)) return setError(OUTDATED);
        // The connection dropped. The entry may or may not have reached the
        // server; either way it is kept under the same id, and the outbox
        // makes sure it is saved exactly once.
        if (keepable) return keep(keepable, true);
        // The Owner's cash cannot be kept: the form stays as it is, under
        // the same id, so pressing Save again can never make a second one.
        return setError(
          "The connection dropped before the answer came back. When the internet is back, check the list: if the entry is not there, press Save again — it is never saved twice.",
        );
      }
      if (!result.ok) return setError(result.error);
      setNotice(result.data.alreadySaved ? "This entry had already been saved, so it was not saved twice." : "");
      startNext();
      // The offline copy of the day should have it if the internet goes next.
      requestDayRefresh();
    });
  }

  return (
    <Panel>
      <PanelHeader title="New entry" action={offline ? <Badge variant="warning">Offline</Badge> : null} />
      <form onSubmit={submit} className="space-y-3.5 px-card py-4" noValidate>
        <Field label="Folder" htmlFor="entry-kind">
          <NativeSelect
            id="entry-kind"
            className="w-full"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as FormKind);
              setPin("");
              setError("");
            }}
          >
            {(Object.keys(KIND_LABEL) as FormKind[]).map((k) => (
              <NativeSelectOption key={k} value={k} disabled={offline && isOwnerKind(k)}>
                {KIND_LABEL[k]}
                {offline && isOwnerKind(k) ? " (needs the internet)" : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        {kind === "staff_advance" ? (
          <Field label="Staff member" htmlFor="entry-staff">
            <NativeSelect id="entry-staff" className="w-full" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((member) => (
                <NativeSelectOption key={member.id} value={member.id}>
                  {member.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <Field
            label={kind === "expense" ? "Description" : "Purpose"}
            htmlFor="entry-description"
          >
            <Input
              id="entry-description"
              value={description}
              maxLength={120}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                kind === "expense" ? "Tea, lunch, towels" : kind === "owner_took" ? "Bank deposit" : "Change for the drawer"
              }
            />
          </Field>
        )}

        {kind === "expense" ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Paid from</p>
            <Segmented label="Paid from" value={paidFrom} onChange={setPaidFrom} options={PAID_FROM} />
          </div>
        ) : null}

        <Field label="Amount (Rs)" htmlFor="entry-amount">
          <Input
            id="entry-amount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className="h-10 tabular-nums"
          />
        </Field>

        {needsPin && !ownerOffline ? (
          <Field
            label="Owner's PIN to confirm"
            htmlFor="entry-pin"
            hint="The Owner confirms cash taken from or added to the drawer with their own PIN."
          >
            <PasswordInput id="entry-pin" inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4-digit PIN"
              className="h-10 tracking-widest"
            />
          </Field>
        ) : null}

        {/* The internet went while the Owner's cash was chosen: say so rather than let it fail on Save. */}
        {ownerOffline ? (
          <p role="note" className="rounded-md border border-warning-line bg-warning-soft px-3 py-2 text-xs text-warning">
            The Owner&apos;s cash needs the internet: their PIN is checked by the server. Choose an expense or a staff
            advance, or enter this when the internet is back.
          </p>
        ) : offline ? (
          <p className="text-xs text-muted-foreground">
            No internet: the entry is kept on this computer and sent to the server by itself when the internet is back.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {notice ? (
          <p role="status" className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {notice}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending || ownerOffline}>
          {pending ? (offline ? "Keeping..." : "Saving...") : offline ? "Save offline" : "Save entry"}
        </Button>
      </form>
    </Panel>
  );
}
