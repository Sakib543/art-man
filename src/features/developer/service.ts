import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { resettleDay } from "@/db/day-settlement";
import { allowFinancialEdit, denyFinancialEdit } from "@/db/financial-edit";
import { billLines, bills as billsTable, user as userTable } from "@/db/schema";
import { setUserPassword } from "@/db/user-account";
import { checkNewPassword } from "@/lib/auth/password-rules";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { hashPin } from "@/lib/pin";
import { checkBillEdit } from "./bill-edit-rules";
import { checkUsername, usernameKey } from "./username-rules";
import { findBillForEdit, listStaffForEdit } from "./queries";
import type { EditBillRowInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

async function loadTarget(userId: string) {
  const [row] = await db
    .select({ id: userTable.id, username: userTable.username, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!row) throw new UserError("That account no longer exists.");
  return row;
}

/**
 * Set a login password and sign that account out everywhere.
 *
 * **The developer may do this to their own account**, which every other role
 * is refused. The reason is that nobody stands above the developer: the Owner
 * and the Manager can always be rescued from this screen, and a second
 * developer could rescue the first, but a salon with one developer account has
 * no way back into it. Settings is not that way back — it asks for the current
 * password, so it helps only someone who already knows it.
 *
 * Two things make a self-reset safe rather than merely allowed:
 *
 * - `keepToken` spares the session doing the resetting, so the developer is
 *   not signed out by their own click. Every *other* session of theirs still
 *   goes, which is the point of a reset.
 * - it is audited as `password.self-reset`, a different action from the reset
 *   of somebody else, so the log says plainly which happened.
 *
 * What this does **not** fix is being locked out already: you have to be
 * signed in to reach this screen at all. A forgotten password with no live
 * session is still a database job — see `docs/HANDOFF.md` section 9.
 */
export async function resetPassword(
  dev: SessionUser,
  userId: string,
  newPassword: string,
  /** The session running this. Only used when the developer resets themselves. */
  currentToken?: string,
): Promise<void> {
  const problem = checkNewPassword(newPassword);
  if (problem) throw new UserError(problem);

  const self = userId === dev.id;
  const target = await loadTarget(userId);
  await setUserPassword(target.id, newPassword, self ? currentToken : undefined);

  await writeAudit(db, {
    actor: actorOf(dev),
    action: self ? "password.self-reset" : "password.reset",
    target: target.username ?? target.id,
    after: { by: "developer" },
  });
}

/**
 * Change the developer's own username.
 *
 * Only their own, and only theirs: the Owner's and the Manager's usernames are
 * the salon's, printed on whatever the counter staff were handed, and a
 * developer renaming one of those out from under them would be a support call,
 * not a feature. This account belongs to whoever maintains the system, so it
 * is theirs to name.
 *
 * The session survives, because a session is bound to the account's id and
 * knows nothing about its username — but the *next* sign-in needs the new one,
 * which is why the screen says so.
 */
export async function changeOwnUsername(dev: SessionUser, next: string): Promise<void> {
  const problem = checkUsername(next, dev.username);
  if (problem) throw new UserError(problem);

  const wanted = next.trim();
  const key = usernameKey(wanted);

  // `user.username` is unique in the database, so this is a nicer message
  // rather than the guarantee — the constraint is the guarantee.
  const [taken] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.username, key))
    .limit(1);
  if (taken && taken.id !== dev.id) throw new UserError("That username is already taken.");

  await db.transaction(async (tx) => {
    // `username` is what is matched at sign-in and is lower case; the display
    // one keeps the capitals the person typed. That is the plugin's own
    // convention — see `seed-users.ts`, which sets both.
    await tx
      .update(userTable)
      .set({ username: key, displayUsername: wanted })
      .where(eq(userTable.id, dev.id));

    await writeAudit(tx, {
      // The name they had while doing it. The `before` says what it was, so
      // the row reads correctly from either end.
      actor: actorOf(dev),
      action: "username.change",
      target: dev.id,
      before: { username: dev.username },
      after: { username: key },
    });
  });
}

/**
 * Set a new PIN for the Owner. Only the Owner has one (see `src/lib/pin.ts`),
 * so this refuses any other account rather than quietly storing a PIN nobody
 * will ever be asked for.
 *
 * A PIN cannot be read back, not even here: it is a scrypt hash. Resetting it
 * is the only way to recover a forgotten one, and it is audited.
 */
export async function resetPin(dev: SessionUser, userId: string, newPin: string): Promise<void> {
  const target = await loadTarget(userId);
  if (target.role !== "owner") throw new UserError("Only the Owner has a PIN.");

  await db.transaction(async (tx) => {
    await tx.update(userTable).set({ pinHash: await hashPin(newPin) }).where(eq(userTable.id, target.id));
    await writeAudit(tx, {
      actor: actorOf(dev),
      action: "owner.pin-reset",
      target: target.username ?? target.id,
      after: { by: "developer" },
    });
  });
}

/**
 * Change a bill in place — the one thing the database otherwise forbids
 * outright (backlog P1.6). Everything about it is deliberately narrow:
 *
 * - it edits the lines the bill already has, and never adds or removes one;
 * - it refuses a reversal bill and a cancelled bill, because each is half of a
 *   mirrored pair and changing one side alone would leave the day wrong;
 * - the lines must still add up to what was paid;
 * - the hatch through the append-only triggers is opened inside this one
 *   transaction and dies with it;
 * - `before` and `after` go to `audit_log`, which the hatch cannot touch;
 * - a closed day is settled again, so its figures follow the edit and its
 *   security code changes — the old one is kept in `day_snapshot_history`.
 *
 * What it does NOT put right: a closed month's report was frozen when the
 * month closed and is not recomputed. The screen says so, and the audit entry
 * records that the month was closed.
 */
export async function editBillRow(dev: SessionUser, input: EditBillRowInput): Promise<void> {
  const { bill, block } = await findBillForEdit(input.billNo);
  if (block === "not-found") throw new UserError(`There is no bill #${input.billNo}.`);
  if (block === "reversal") throw new UserError("This is a reversal bill. Edit the bill it reverses.");
  if (block === "cancelled") throw new UserError("This bill is cancelled. Edit the bill that replaced it.");
  if (!bill) throw new UserError(`There is no bill #${input.billNo}.`);

  const problem = checkBillEdit(input, bill.lines.map((line) => line.id));
  if (problem) throw new UserError(problem);

  const known = new Set((await listStaffForEdit()).map((member) => member.id));
  if (input.lines.some((line) => !known.has(line.staffId))) throw new UserError("One of the chosen staff members does not exist.");

  const actor = actorOf(dev);
  const before = {
    cash: bill.cash,
    online: bill.online,
    bookNo: bill.bookNo,
    lines: bill.lines,
  };
  const after = {
    cash: input.cash,
    online: input.online,
    bookNo: input.bookNo,
    lines: input.lines,
  };

  await db.transaction(async (tx) => {
    await allowFinancialEdit(tx);

    await tx
      .update(billsTable)
      .set({ cash: input.cash, online: input.online, bookNo: input.bookNo })
      .where(eq(billsTable.id, bill.id));

    for (const line of input.lines) {
      await tx
        .update(billLines)
        .set({ name: line.name.trim(), amount: line.amount, staffId: line.staffId })
        .where(eq(billLines.id, line.id));
    }

    // Shut the hatch again here, not at the end of the transaction. Nothing
    // below this line is supposed to change a financial row, so nothing below
    // it is allowed to.
    await denyFinancialEdit(tx);

    // A closed day already wrote its commissions and its closing record from
    // the old figures. Settling again reverses those and writes a new snapshot
    // with a new security code, keeping the old one in day_snapshot_history.
    if (bill.dayClosed) {
      await resettleDay(tx, bill.businessDate, actor, `bill #${bill.billNo} edited by the developer`);
    }

    await writeAudit(tx, {
      actor,
      action: "bill.developer-edit",
      target: `bill #${bill.billNo}`,
      before,
      after: { ...after, reason: input.reason, businessDate: bill.businessDate, monthClosed: bill.monthClosed },
    });
  });
}
