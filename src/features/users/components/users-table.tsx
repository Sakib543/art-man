"use client";

import { KeyRound, Lock, LockOpen } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormFeedback } from "@/components/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/components/use-form-action";
import { checkNewPassword } from "@/lib/auth/password-rules";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { resetUserPasswordAction, setUserActiveAction } from "../actions";
import { checkResetPassword, checkSetActive, type Viewer } from "../rules";
import type { UserRow } from "../types";
import { ROLE_TEXT } from "./role-text";
import { Panel } from "@/components/panel";

const ROLE_LABEL = { owner: "Owner", manager: "Manager", developer: "Developer" } as const;

type Mode = "password" | "close" | "reopen";

interface UsersTableProps {
  rows: UserRow[];
  viewer: Viewer;
  activeOwners: number;
}

/**
 * The account list. Every button asks `rules.ts` whether it is allowed before
 * it is drawn, and the Server Action asks the same function again — so a
 * button is never shown for something the server would refuse, and hiding a
 * button is never what makes an action safe.
 */
export function UsersTable({ rows, viewer, activeOwners }: UsersTableProps) {
  const [target, setTarget] = useState<UserRow | null>(null);
  const [mode, setMode] = useState<Mode>("password");
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function openFor(row: UserRow, next: Mode) {
    setTarget(row);
    setMode(next);
    setPassword("");
    fail("");
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;

    if (mode === "password") {
      const problem = checkNewPassword(password);
      if (problem) return fail(problem);
      return run(
        () => resetUserPasswordAction({ userId: target.id, newPassword: password }),
        `${target.username} has a new password and has been signed out everywhere.`,
        () => setPassword(""),
      );
    }

    const next = mode === "reopen";
    run(
      () => setUserActiveAction({ userId: target.id, active: next }),
      next ? `${target.username} can sign in again.` : `${target.username} is closed and signed out.`,
      () => setOpen(false),
    );
  }

  return (
    <>
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken text-left text-xs text-muted-foreground">
              <th className="px-3.5 py-2 font-medium">Username</th>
              <th className="px-3.5 py-2 font-medium">Name</th>
              <th className="px-3.5 py-2 font-medium">Role</th>
              <th className="px-3.5 py-2 font-medium">Added</th>
              <th className="px-3.5 py-2 font-medium">Status</th>
              <th className="px-3.5 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const summary = { id: row.id, role: row.role, active: row.active };
              const noPassword = checkResetPassword(viewer, summary);
              const noClose = checkSetActive(viewer, summary, false, activeOwners);
              const noReopen = checkSetActive(viewer, summary, true, activeOwners);

              return (
                <tr key={row.id} className={cn("border-b last:border-b-0", !row.active && "text-muted-foreground")}>
                  <td className="px-3.5 py-2.5 font-medium">{row.username}</td>
                  <td className="px-3.5 py-2.5">{row.name}</td>
                  <td className="px-3.5 py-2.5">
                    <span title={ROLE_TEXT[row.role]}>{ROLE_LABEL[row.role]}</span>
                    {row.role === "owner" && !row.hasPin ? (
                      <span className="block text-xs text-warning">No PIN set yet</span>
                    ) : null}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3.5 py-2.5">
                    {row.active ? (
                      <Badge variant="success">Open</Badge>
                    ) : (
                      <Badge variant="secondary">Closed</Badge>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    {noPassword ? null : (
                      <Button variant="ghost" size="sm" onClick={() => openFor(row, "password")}>
                        <KeyRound aria-hidden />
                        Password
                      </Button>
                    )}
                    {row.active && !noClose ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => openFor(row, "close")}
                      >
                        <Lock aria-hidden />
                        Close
                      </Button>
                    ) : null}
                    {!row.active && !noReopen ? (
                      <Button variant="ghost" size="sm" onClick={() => openFor(row, "reopen")}>
                        <LockOpen aria-hidden />
                        Re-open
                      </Button>
                    ) : null}
                    {/* Say why, rather than leave a row with no buttons and no explanation. */}
                    {row.active && noClose && noPassword ? (
                      <span className="text-xs text-muted-foreground">{noClose}</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>
                {mode === "password"
                  ? `New password for ${target?.username}`
                  : mode === "close"
                    ? `Close ${target?.username}?`
                    : `Re-open ${target?.username}?`}
              </DialogTitle>
              <DialogDescription>
                {mode === "password"
                  ? "They are signed out everywhere. Read the new password out to them — it cannot be shown again."
                  : mode === "close"
                    ? "They are signed out at once and cannot sign in again. Nothing is deleted: everything they did stays in the record, and the account can be re-opened."
                    : "They can sign in again with the password they had."}
              </DialogDescription>
            </DialogHeader>

            {mode === "password" ? (
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-label="New password"
                autoComplete="off"
                spellCheck={false}
                className="mt-3 h-10 font-mono"
              />
            ) : null}

            <div className="mt-3">
              <FormFeedback error={error} done={done} />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant={mode === "close" ? "destructive" : "default"} disabled={pending}>
                {pending
                  ? "Saving..."
                  : mode === "password"
                    ? "Set password"
                    : mode === "close"
                      ? "Close account"
                      : "Re-open account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
