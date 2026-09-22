# Backlog — what is left to build

The work queue. Higher sections come first. Each item records why it matters, how big it is, and
what it depends on.

**Status:** ⬜ open · 🟡 in progress · ✅ done

**Two developers share this repo and both work on `main`.** Before starting an item, put your name
and the date in its **Owner** line and push that change first, so the other person sees it. See
`docs/HANDOFF.md` section 2 for the full coordination rules.

Last updated: 2026-09-22 (P0 complete; P1.0, P2.1, P1.4, P1.5, P5.2, P1.1 and P1.6 done)

---

## Item index

| ID | Item | Status | Owner |
|---|---|---|---|
| P0.1 | Show the real login error | ✅ | done 2026-09-22 |
| P0.2 | Reopen a closed day (Owner) | ✅ | done 2026-09-22 |
| P0.3 | Cancel a bill/entry in a closed day (Owner) | ✅ | done 2026-09-22 |
| P1.0 | Remove the staff PIN | ✅ | done 2026-09-22 |
| P1.1 | Developer role (super admin) | ✅ | done 2026-09-22 |
| P1.2 | Users screen — create admins | ⬜ | — |
| P1.4 | Owner edits a bill on the open day | ✅ | done 2026-09-22 |
| P1.5 | Owner's edit leaves one line, not three | ✅ | done 2026-09-22 |
| P1.6 | Developer edits a financial entry | ✅ | done 2026-09-22 |
| P1.3 | Manager's limit | ✅ | no change needed |
| P2.1 | Paper bill-book number | ✅ | done 2026-09-22 |
| P2.2 | Offline PWA + sync | ⬜ | — |
| P3.1–P3.7 | Remaining spec features | ⬜ | — |
| P3.8 | Customer's last visit on the billing screen | ✅ | done 2026-09-22 |
| P4.1–P4.8 | Cleanup | ⬜ | — |
| P4.9 | Index the financial tables | 🟡 | Sakib543, 2026-09-22 |
| P5.1–P5.3 | Deployment | 🟡 | P5.2 done 2026-09-22 |

---

## P0 — Before the client trial

Without these three, the 20-day trial is likely to get stuck.

### ✅ P0.1 — Show the real login error
**Done:** 2026-09-22

Every failure used to show `"Wrong username or password."` — an unreachable database, a bad
connection string, anything. The real cause was never visible. This is why the Vercel problem could
not be diagnosed, and it wasted time locally twice.

**What was built:**

- `src/lib/auth/sign-in-error.ts` — a pure function mapping a failure to a message. A wrong
  password keeps the vague wording (it must not reveal which accounts exist); a server fault says
  plainly that it is not the password, and names the HTTP status so support has something to go on.
  Separate messages for no-reply (status 0) and rate limiting (429).
- `src/lib/auth/sign-in-error.test.ts` — 6 tests.
- `login-form.tsx` — calls it, and now also survives a request that throws instead of returning an
  error. Full detail goes to the browser console; the screen shows one sentence.

**Verified:** 139 tests pass (was 133), lint clean, build passes. Both paths then confirmed
against the live server: a wrong password returns 401 with `INVALID_USERNAME_OR_PASSWORD` and still
reads *"Wrong username or password."*, while a genuinely unreachable database returns 500 and now
reads *"…This is a problem with the system, not your password (error 500)…"* instead of blaming
the password.

---

### ✅ P0.2 — Reopen a closed day (Owner only)
**Done:** 2026-09-22

The screen had claimed *"Only the Owner can reopen a closed day"* while no such function existed.

**The part that needed care.** Simply clearing `closed_at` would have been wrong. A close writes
khata earnings, khata payments and staff-payment cash rows, and all three are append-only. Closing
again would have written them a second time and **doubled every staff member's pay** in the khata
and in expected cash. Undoing a close properly means reversing what it wrote.

**How it works now** — `reopenDay()` in `src/features/day-close/service.ts`, one transaction:

1. The closing record is copied into the new `day_snapshot_history` table with the reason, who did
   it and when. That table is fully append-only, so the original figures **and the original
   security code** survive for good.
2. The khata lines the close wrote (`earning`, `payment`) are reversed with `adjustment` rows that
   point back at them through the new `khata_entries.reverses_entry_id` column. A line an earlier
   reopen already reversed is skipped, so reopening twice cannot subtract it twice.
3. The staff-payment cash rows are cancelled with negative rows carrying `voids_entry_id` — exactly
   how a folder entry is cancelled.
4. Attendance for the day is cleared; it is marked again at the next close.
5. The live snapshot is deleted and `closed_at` is cleared, under a conditional update so two
   reopens cannot race.

**Guards:** Owner only (`requireRole("owner")`); a reason of at least 3 characters; only the
**latest** business day, and only while it is closed; refused once the month is closed. Only the
latest day can be reopened because a later day's opening cash is this day's count and its security
code is built on this one's.

**Migration `0009_fast_green_goblin.sql`** also narrows one trigger: `day_snapshots` still can
never be **updated**, but it may now be **deleted**. The snapshot is derived data — the bills and
cash entries it is computed from stay fully append-only — and nothing is lost, because the row is
archived in `day_snapshot_history` and its security code is written to the audit log first.

**Verified** end to end in the browser, not just in tests. Closed the day (code `2916-A3FE-B0D3`,
expected Rs 4,200, Sherry paid Rs 800), reopened it with a reason, then closed it again:

| Check | Result |
|---|---|
| Day reopened | `closed_at` cleared, wizard back at step 1 |
| Old closing record | kept in history with its code, reason and actor |
| Khata | original rows intact, two reversal rows added, balance back to 0 |
| Staff payment | cancelled with a matching negative row |
| Attendance | cleared, then re-marked at the next close |
| **No double counting** | second close showed *staff payments −800*, not −1,600; expected cash Rs 4,200 again; `staff_earned` 800, `day_profit` −800, same as the first close |
| Security code | changed to `6373-6907-1EA0`, so the reopen is detectable |
| Audit log | `day.close` → `day.reopen` → `day.close` |
| Empty reason | rejected |
| Manager | sees neither the button nor the action |

139 tests pass, lint clean, build passes.

---

### ✅ P0.3 — Cancel a bill or entry in a closed day (Owner only)
**Done:** 2026-09-22

The code used to say *"Only the Owner can cancel it"* while refusing everyone. Spec 11 gives the
Owner this right until the month is closed.

**The catch, again.** Cancelling a bill in a closed day changes that day's sale, its expected cash,
and the commission its work earned — all of which the close had already written down. So the
cancellation alone is not enough: the day has to be settled again.

`resettleDay()` (`src/db/day-settlement.ts`) does that inside the same transaction as the
cancellation: it reverses the earnings the close posted, posts the corrected ones, archives the
closing record into `day_snapshot_history`, and writes a fresh snapshot with a new security code.
Staff payments are left alone — that cash really was handed over. **Counted cash is left alone
too**: the drawer was counted by hand, so only what was *expected* of it moves, and the difference
is what shows the correction.

**Guards:** Owner only, month must be open, the bill must not already be cancelled, a reason of at
least 3 characters. A reversal bill still cannot be cancelled.

**Where it lives.** `cancelBill` moved to `src/db/bill-cancel.ts` and the shared settling to
`src/db/day-settlement.ts` (with `security.ts` → `src/db/day-code.ts`), so Billing and Daily report
can both use them without importing across features. `ARCHITECTURE.md` rule 5 still has **0
violations**.

**UI:** the Daily report table grows a Cancel button per active bill, shown only to the Owner and
only on a day that is closed. Today's bills are still cancelled from Billing as before.

**Verified** end to end: reopened the day, billed Rs 800 to Arshad, closed (sale 800, expected
5,000, counted 5,000, difference 0, staff earned 880, code `CE61-1D17-E8BF`), then cancelled the
bill from the Daily report:

| Check | Result |
|---|---|
| Reversal bill | #2 for −800 added; #1 marked cancelled |
| Sale and cash | 800 → 0 |
| Expected cash | 5,000 → 4,200 |
| Counted cash | 5,000, unchanged — the hand count is not rewritten |
| Difference | 0 → **+800**, which is exactly the cancelled cash showing up as extra |
| Arshad's commission | reversed with an `adjustment` row; balance back to 0 |
| Staff earned | 880 → 800 |
| Old closing record | archived with its code and "Corrected: bill #1 cancelled" |
| New security code | `6982-BCC5-9483` |
| Audit log | `bill.cancel-closed-day` |
| Manager | no button, and the action refuses |

139 tests pass, lint clean, build passes.

---

## P1 — Roles, admin and PIN

Only two roles exist today: `owner` and `manager` (`src/lib/auth/roles.ts`).

### ✅ P1.0 — Remove the staff (karigar) PIN from the whole project
**Done:** 2026-09-22

**Client decision (2026-09-22):** the staff PIN is not needed.

> **The Owner PIN stays.** These are two different columns: `staff.pin_hash` (removing) and
> `user.pin_hash` (keeping). `src/lib/pin.ts` and `src/db/pin-guard.ts` also stay — the Owner PIN
> uses them.

**The client was told:** the staff PIN is the staff member's own proof that they were paid. Without
it, the Manager can record any payment and the staff member has no confirmation. The khata is what
wages are calculated from, so in a dispute neither side has evidence. (Spec §5.2, §5.4 step 3.)
**The client decided no replacement is wanted** — just remove it.

**What changes:**

| Place | Work |
|---|---|
| Migration | Drop `staff.pin_hash`. Safe: `staff` carries no append-only trigger |
| `features/staff-rates` | PIN field in the form, `service.ts`, `schemas.ts` |
| `features/folders` | PIN confirmation on a staff advance |
| `features/day-close` | `verifyPayouts()`, the PIN fields in `staff-steps.tsx` |
| `cash_entries.pin_confirmed` | Column stays, but now only applies to Owner entries |
| `scripts/seed-sample.ts` | Remove 1111 / 2222 / 3333 |
| Docs | Fix the references in the spec, `PROJECT_GUIDE.md`, `README.md` |
| Tests | Update affected tests |

**What was done:**

- Migration `drizzle/0008_busy_lockjaw.sql` — `ALTER TABLE "staff" DROP COLUMN "pin_hash";`
- `staff-rates`: PIN field gone from the form, schema and service. Adding a staff member no longer
  demands a PIN, and the `staff.pin-reset` audit action is gone with it.
- `folders`: a staff advance no longer asks for or checks a PIN. `pinConfirmed` is now set only for
  `owner_took` / `owner_added`.
- `day-close`: `verifyPayouts()` and `verifyPayoutsAction()` deleted, the PIN column removed from
  step 3, and step 3 → 4 is now a plain move instead of a server round-trip. A staff payment is no
  longer written as "PIN confirmed".
- `scripts/seed-sample.ts`: PINs 1111 / 2222 / 3333 gone.
- Docs: the spec and `PROJECT_GUIDE.md` record the change and its date, rather than pretending the
  PIN was never there.

**Kept, as decided:** the Owner PIN (`user.pin_hash`), `src/lib/pin.ts`, `src/db/pin-guard.ts`, the
Settings PIN form, and the wrong-PIN lock and audit trail — all of which now serve the Owner alone.

**Verified:** 139 tests pass, lint clean, build passes, migration applied. Then checked in the
browser: the Add-staff dialog has no PIN field and saves (audit log recorded `staff.create`), a
staff advance shows only the person and the amount, Owner-took-cash still asks for the 4-digit PIN,
and Day Close step 3 no longer has a Staff PIN column. Confirmed in the database that
`staff.pin_hash` is gone and `user.pin_hash` survives.

---

### ✅ P1.1 — Fourth role: `developer` (super admin)
**Done:** 2026-09-22

**Client decision (2026-09-22):** a role above Owner that can do everything — reset passwords,
edit anything, and take the site down in one click.

**Client decision (2026-09-22, during this task):** *the developer must not show up in Settings;
they just sign in with a username and a password, and nothing else about them is on display.* So
there is no developer section on the Settings screen, and the Owner and the Manager see no sign
that the role exists. The developer's own tools live in a sidebar section only they can see.

That reverses one line of the original plan — *"the account is not hidden"* — as far as the
**screens** go. It does not touch the part that matters: the account is an ordinary row in
`user`, it appears on the developer's own Passwords screen, and **every action it takes is still
written to `audit_log`**. Nothing is hidden from the record, only from the other two screens.

**What was built:**

- `src/lib/auth/roles.ts` — `developer` added to `ROLES`, and `canAccess` now lets the developer
  through any check the owner or the manager would pass. `atLeastOwner(role)` is the plain-English
  form used where a page previously compared to `"owner"` by hand. 7 tests.
- `requireRole` goes through `canAccess`, so all 26 `requireRole("owner")` call sites accepted the
  developer without being touched. The 9 hand-written comparisons were changed one at a time —
  **three were deliberately left strict**: the owner's PIN form, the owner-only part of Settings,
  and the manager-only hint on Day close. The developer has no PIN, so inheriting those would have
  produced a form that could never work.
- `pnpm db:seed:developer` (`scripts/seed-developer.ts`) creates the account. It is separate from
  `pnpm db:seed` on purpose: the owner and manager belong to the salon, this account belongs to
  whoever maintains the system. Password from `SEED_DEVELOPER_PASSWORD` or generated and printed
  once. No PIN.
- **Audit log screen** (`/developer/audit-log`) — every row, newest first, searchable by who, what
  or which record, 50 per page. `before` / `after` open as JSON.
- **Passwords screen** (`/developer/passwords`) — set a new password for any account (they are
  signed out everywhere) and a new 4-digit PIN for the Owner. The developer cannot change their
  own password here, because it would sign them out mid-click; Settings already does that
  properly. Both resets are audited.
- **Maintenance mode** (`/developer/maintenance`) — one button. While it is on, the Owner and the
  Manager get `/maintenance` ("The system is closed") instead of the app, and the developer keeps
  full use of it, which is how they switch it back on. The switch lives in the new `app_settings`
  table (migration `0011`) and the check sits inside `requireUser()`, so it covers every page
  **and every Server Action** — a layout would not, because layouts do not re-run on client
  navigation.
- Shared bits moved up so the new feature did not import from another one:
  `form-feedback.tsx` and `use-form-action.ts` are now in `src/components/`. `ARCHITECTURE.md`
  rule 5 still has **0 violations**.
- `formatDateTime` added to `src/lib/format.ts` (Karachi time, "21 Sep 2026, 14:30"), with 3 tests.

**Verified** in the browser as all three roles, not just in tests:

| Check | Result |
|---|---|
| Developer signs in with username + password | yes, no PIN anywhere |
| Developer's sidebar | the whole app **plus** Audit log, Passwords, Maintenance |
| Owner's and Manager's sidebar | unchanged — no Developer section, no hint of it |
| Developer's Settings screen | "Change your password" only — nothing developer-specific |
| Manager opens `/developer/audit-log` by URL | bounced to Billing |
| Manager opens `/overview` | still bounced to Billing (no regression) |
| Developer on Billing | sees Edit and Cancel, like the Owner |
| Audit log | 17 existing entries, searchable, `before`/`after` readable |
| Reset the Manager's password | worked; signed in with the new one |
| Close the site | Manager saw "The system is closed"; developer kept working |
| Open the site again | Manager back to normal |

173 tests pass (was 163), lint clean, build passes — 22 routes now.

**Not in this task.** The last capability — **editing or deleting a financial entry** — is split
out into **P1.6** (done later the same day), so the append-only escape hatch got a task of its own. Everything else in the
client's list is done here, except creating and deactivating users, which is P1.2.

**Size:** large

---

### ⬜ P1.2 — Create admins from inside the app
**Owner:** —

Sign-up is disabled (`disableSignUp: true`) and accounts are only created by `pnpm db:seed`. There
is no screen for it.

**What to do:** a "Users" screen — create a user, assign a role, reset a password, deactivate.
Public sign-up stays off.

**Who can use it:** developer and owner (client: *"an old admin should be able to create a 3rd
admin"*).

**Size:** medium · **Depends on:** P1.1

---

### ✅ P1.3 — Manager's limit — no change needed
**Client decision (2026-09-22):** *"The Manager can only view past daily reports, cannot edit —
only the Owner can."*

This is **already how it works**, and it matches spec §10.7. The Manager can see past daily
reports; no one can edit a financial entry.

> The *"only the Owner can"* half was never built though — the Owner cannot cancel a closed day's
> bill either. That is **P0.3**, and this decision makes it more important.

---

### ✅ P1.4 — Owner edits a bill on the open day
**Done:** 2026-09-22

**Client decision (2026-09-22):** the Owner can edit a bill **of the day that is still open**. A
bill in a day that is already closed cannot be edited — only cancelled (P0.3).

**Why the open day is the safe one.** Nothing has been settled yet: no snapshot, no security code,
and commission is not posted to the khata until the close. So a corrected bill needs no unwinding —
the close simply reads the bills as they stand.

**What was built.** It is presented as editing and recorded the way this system records everything:
in one transaction the old bill is cancelled, a reversal undoes its amounts, and the corrected bill
is saved with a **new** number. The daily report shows three lines for one correction, which is the
point (spec 11) — that is exactly what P1.5 is asked to change.

| File | What |
|---|---|
| `bill-draft.ts` (new, pure) | `draftLinesOf` rebuilds the cart from a saved bill; `payModeOf` picks the payment mode it was taken on |
| `bill-draft.test.ts` (new) | 8 tests, including the double-deal case below |
| `bill-cancel.ts` | `writeCancellation` split out of `cancelBill`, so a cancellation can run inside a bigger transaction. `cancelBill` now calls it — same behaviour, one copy of the logic |
| `service.ts` | split into `priceBill` / `writeBill` / `receiptOf`, shared by `createBill` and the new `editBill` |
| `queries.ts` | `getBillForEdit` re-opens a bill, with the same guards as the server |
| `schemas.ts` · `actions.ts` | `editBillSchema` (bill + reason), `editBillAction` behind `requireRole("owner")` |
| `billing-screen.tsx` | edit mode: pre-filled cart, "Correcting bill #N", a required reason, "Save correction" |
| `todays-bills.tsx` · `billing/page.tsx` | an **Edit** link per active bill for the Owner, via `?edit=<billId>` |

**The part that needed care — deal instances.** `bill_lines` records which deal a line came from
but **not which instance**, and one bill may hold the same deal twice. Collapsing both into one
instance would have re-priced a Rs 2,000 bill as Rs 1,000. A deal instance always contributes
exactly one line per service in the deal (`priceCart` refuses anything else), so the n-th line of a
given service belongs to the n-th instance. Verified in the browser, not only in a test.

**Guards:** Owner only (in the action *and* in `editBill`, next to the data); the open day only; not
already cancelled; not a reversal; a reason of at least 3 characters. `getBillForEdit` refuses for
the same reasons **before** the Owner retypes anything, and says which one.

**Decisions taken while building:**

- The cancellation reason is stored as `Edited: <reason>`, so the daily report tells a correction
  apart from a plain cancellation.
- `editBillAction` revalidates `/daily-report` but **not** `/billing`: the screen is still on
  `?edit=<id>` and that bill is now cancelled, so re-rendering it there would swap the screen out
  mid-save. It navigates away itself, which fetches the page fresh.
- No receipt dialog after a correction, for the same reason — the screen leaves edit mode. The
  corrected bill is at the top of Today's bills.
- A re-opened bill is priced against **today's** catalog. If a service or deal has changed since,
  the bill cannot be re-opened and the screen says so rather than opening with a total of 0.

**Verified in the browser** against the dev database, on the open day (23 Sep 2026):

| Check | Result |
|---|---|
| Edit link | shown to the Owner on active bills only |
| Pre-fill | bill #4 opened with Hair wash, Hamid already selected, Rs 300, cash |
| Reason required | saving with it empty was refused |
| One correction | #4 → cancelled, #5 → reversal −300, #6 → Haircut Rs 800. Day total 800 + 300 − 300 + 800 = **Rs 1,600**, paid 2, cancelled 1 |
| Double deal | a bill of the same deal twice re-opened as **two** instances at Rs 2,000, not one at Rs 1,000 |
| Removing one instance | #7 → cancelled, #8 → reversal −2,000 (4 lines), #9 → Rs 1,000. Day total **Rs 2,600**, paid 3, cancelled 2 |
| Worksheet | Arshad 1,000 · Hamid 0 · Sherry 1,600 = 2,600, matching the report — commission base right after both corrections |
| Audit log | two `bill.edit` rows, each with the full `before` and `after` lines, so the old bill is recoverable |
| Already cancelled | re-opening #4 afterwards says so and offers a new bill |
| `?edit=not-a-bill` | says the link does not point at a bill; no crash on a non-uuid |

152 tests pass (was 144), lint clean, build passes.

**Size:** medium

---

### ✅ P1.5 — Owner's edit leaves one line, not three
**Done:** 2026-09-22

**Client asked for this (2026-09-22)**, after seeing what P1.4 would look like: one correction
showed three lines in the Daily report — the cancelled bill, its reversal, and the corrected bill.
They wanted the day to read as one line per bill.

**Client decisions that shaped it:**

- The single line **carries an "Edited" badge with a link to the previous version**. Without a
  marker a corrected bill would look identical to one that was right the first time — exactly what
  spec 11 exists to prevent.
- **The receipt number does not have to stay the same.** That is what made the cheap build possible.

**Built as option B: the view folds, the data does not.** P1.4's cancel + reversal + new bill is
untouched in the database. The Daily report folds those three rows into the newest one. So:

- **The append-only guarantee was never weakened.** No escape hatch, no trigger change, no
  dependency on P1.1. The only schema change is one nullable column.
- **No total moves.** A cancelled bill and its reversal add up to zero, so the visible rows sum to
  exactly what every row summed to before. There is a test that asserts precisely this.

| File | What |
|---|---|
| `0010_demonic_reaper.sql` | `ALTER TABLE bills ADD COLUMN supersedes_bill_id uuid` — that is the whole migration |
| `service.ts` | `editBill` sets it on the corrected bill |
| `day-bills.ts` | `supersedesBillId` and `reversesBillId` on `DayBill` |
| `corrections.ts` (new, pure) | `foldCorrections` folds a correction's rows into the newest and hands it the earlier versions; `editReason` strips the `Edited:` prefix |
| `corrections.test.ts` (new) | 11 tests |
| `summary.ts` | new `editedBills` count |
| `previous-versions.tsx` (new) | the dialog behind the link: every earlier version with its lines, total and the reason it changed |
| `report-table.tsx` · `daily-report/page.tsx` | the badge, the link, and an **Edited** stat card |

**A plain cancellation is still two lines.** Nothing replaced it, so nothing is folded — the mistake
stays visible, as spec 11 requires. A corrected bill is counted as **edited, not cancelled**, so the
"3 bills were cancelled" alert no longer fires because the Owner fixed some typing.

**Verified in the browser** against the dev database, on the open day (23 Sep 2026):

| Check | Result |
|---|---|
| One correction | bill #3 corrected → report showed **one** row, `#11 · Edited · Paid`. Total sales stayed Rs 2,600 |
| The link | "See previous version" opened #3 with its line, total and *"Changed because: Arshad did this haircut, not Sherry"* |
| Corrected twice | #11 corrected again → **five** rows folded into `#13`, reading "See 2 previous versions"; Edited count stayed 1 |
| Totals | Rs 2,900 after adding a Rs 300 service — the fold moved nothing |
| Plain cancellation | #9 cancelled normally → still **two** lines, no Edited badge, counted as cancelled, alert fired |
| Book number | carried through the correction onto the new bill |

163 tests pass (was 152), lint clean, build passes.

**Known and expected:** corrections made **before** this migration are not folded — their
`supersedes_bill_id` is null because nothing recorded it at the time. Two such corrections are in
the dev database and still show as three lines each. The client's database has no corrections yet,
so nothing there is affected.

**Left as it was on purpose:** Today's bills on the Billing screen still lists every row. It is the
counter's working list, and the Owner has just made the correction there and should see exactly
what it did. Only the Daily report — the record the client reads — folds. Say so if the client
wants both.

**Size:** medium · **Depended on:** P1.4 (done). Option A's dependency on P1.1 did not apply.

---

### ✅ P1.6 — Developer edits a financial entry
**Done:** 2026-09-22

Split out of P1.1 so the escape hatch through the append-only triggers got a task of its own.

**Client decision (2026-09-22):** approved, after being told plainly that it weakens spec §11
(*"No edit / no delete of financial entries — not even the Owner"*) and the security-code chain.

**Scope decided with the user (2026-09-22):** **a bill and its lines, and nothing else.** No cash
entries, no khata, no monthly expenses, and **no delete** — a row may change, it may not vanish.
A bill is what the client actually argues about, and one narrow path could be built and tested
properly in one go.

**How the hatch works** — migration `0012_developer_edit_hatch`:

```sql
select set_config('app.allow_financial_edit', 'on', true);
```

`forbid_change()` now lets a row through when that setting is on. The third argument is what makes
it safe: `is_local`, so PostgreSQL resets the setting when the transaction commits or rolls back.
It cannot survive on a pooled connection and reach the next request, and nothing has to remember
to close it.

**What the hatch deliberately does NOT open:**

| Table | Why |
|---|---|
| `audit_log` | If the hatch could open it, the developer could erase the evidence of having used it, and the whole guarantee would be worth nothing |
| `day_snapshot_history` | Same reason: it is the record of every superseded closing record |
| `day_snapshots` (UPDATE) | Keeps `forbid_update()` from `0009`. Nothing needs it — `resettleDay()` archives the old row and inserts a new one |

Those two tables now run `forbid_change_always()`, which no setting opens.

**What was built:**

- `src/db/financial-edit.ts` — `allowFinancialEdit(tx)` and `denyFinancialEdit(tx)`. **The only
  place in the app that may set that config.** The hatch is shut again as soon as the two
  statements that need it have run, so settling the day and writing the audit entry happen with it
  closed.
- `src/features/developer/bill-edit-rules.ts` — pure, so the form and the server apply the same
  rules: the same line ids as the bill has (no adding, no removing), whole non-negative rupees, a
  total above zero, and cash + online equal to the lines. 11 tests.
- `findBillForEdit()` refuses three cases up front rather than on save: a bill that does not exist,
  a **reversal** bill, and a **cancelled** bill. The last two are each half of a mirrored pair, and
  changing one side in place would leave the day wrong in a way nothing else checks.
- `editBillRow()` — one transaction: open the hatch, update the bill and its lines, shut the
  hatch, settle the day again if it is closed, write `before` and `after` to `audit_log`.
- `/developer/bills` — find a bill by number and edit it. Badges for "Day closed" and "Month
  closed", and a warning for each: a closed day will be settled again and its security code will
  change; a closed month's report was frozen and is **not** recalculated.

**Verified** against the dev database, not only in tests. First at the SQL level:

| Check | Result |
|---|---|
| `update bills`, hatch shut | refused — *financial records are append-only* |
| `update bills` / `bill_lines`, hatch open | allowed |
| `update` or `delete audit_log`, hatch open | **refused** |
| `update day_snapshot_history`, hatch open | **refused** |
| `update day_snapshots`, hatch open | **refused** |
| Same connection after the transaction commits | setting reads empty, update refused again — no leak |

Then through the app, as the developer:

| Check | Result |
|---|---|
| Bill #13 on an **open** day | price 800→900, staff Arshad→Sherry, cash 1,100→1,200. Row changed in place; `before`/`after` both in `audit_log`; no snapshot to settle |
| Payment that no longer matches | refused, in the browser and on the server: *"Cash and online are Rs 200 more than the bill's Rs 1000."* |
| Closed the day | security code `4875-8460-E6FC`, sale Rs 2,000 |
| Bill #13 on the **closed** day | 900→700. Sale Rs 1,800, expected cash 6,030→5,830, **counted cash untouched**, new code `17F1-B378-808C`, old one archived with the reason and the actor |
| A second edit on the same closed day | 700→800 split 700 cash / 400 online. Code `D283-D3BF-87EB`, **both** earlier codes kept in history in order |
| Khata after two edits | commission reversed and reposted each time, no double counting: Sherry 970 earned → 950 → 960 against Rs 970 paid, so her balance reads −10, which is exactly right |
| Reversal bill (#14) | refused — *edit the bill it reverses* |
| Cancelled bill (#11) | refused — *edit the bill that replaced it* |
| A number that does not exist | refused |
| Manager opens `/developer/bills` | bounced to Billing |

184 tests pass (was 173), lint clean, build passes.

**Deliberately not handled:** a **closed month**. Its report and the partners' shares were frozen
in `month_closes.report` when the month closed and are not recalculated, so after an edit they no
longer match the bills. The screen says so in red and the audit entry records `monthClosed: true`.
Recalculating them would rewrite a record the partners have already been paid against, which is a
bigger decision than this task — raise it with the client if it ever comes up.

**Size:** large · **Depended on:** P1.1 (done)

---

## P2 — Offline

**Client decision (2026-09-22):** *"Like a proper offline app — if there is no internet for 6–8
hours the app must keep working, and when the connection returns the database updates."*

So **P2.2 is approved.** P2.1 still gets built first: it is a cheap stopgap until P2.2 ships, and
it stays useful whenever the power is out.

### ✅ P2.1 — Cheap fallback: the paper bill book (spec §5.5)
**Done:** 2026-09-22

When power or internet fails, the counter uses a numbered paper bill book; those bills are entered
before that day's Day Close, carrying the number written on the paper slip.

`bills.book_no` had existed since migration `0000` but nothing ever wrote or read it. It is now
live, so **no migration was needed** — the column was already in every database.

**What was built:**

- `schemas.ts` — `bookNo` on `createBillSchema`: trimmed, at most 20 characters, and **empty
  becomes `null`**. The screen always sends the input's value, so an ordinary bill arrives as `""`;
  storing that as an empty string would have made "no book number" indistinguishable from a blank
  one written down.
- `service.ts` — saves it on the bill and records it in the `bill.create` audit entry.
- `billing-screen.tsx` — a compact "Bill book no." row under the bill number, always visible and
  optional. No toggle: the counter is working through a stack of paper slips after an outage and
  should not have to turn a mode on for each one.
- `day-bills.ts` — `bookNo` on `DayBill`, so both bill lists can show it.
- The daily report and Today's bills print `Book <number>` under the bill number. The Bill column
  widened to `w-32` so a number like `B-2/45` stays on one line.
- `schemas.test.ts` — 5 tests covering blank, whitespace, trimming, a hand-labelled number, and
  the length limit.

**Deliberately left alone:** a cancellation's reversal bill does not copy the book number. The
reversal is generated here, not written on paper, and it already says which bill it cancels.

**Verified in the browser** against the dev database, not only in tests. On the open day
(23 Sep 2026): bill #3 saved with `  B-2/45  ` typed in — the server log shows the raw
`{"bookNo":"  B-2/45  "}` arriving and the report reads `Book B-2/45`, so the trim works end to
end. Bill #4 saved with the field left blank (`{"bookNo":""}`) shows **no** book line at all.
Day totals unchanged at Rs 1,100.

144 tests pass (was 139), lint clean, build passes.

**Still worth doing, outside the code:** recommend a UPS and a 4G backup device.

**Size:** small · **Value:** high

---

### ⬜ P2.2 — Real offline PWA + sync *(client approved)*
**Owner:** —

The app keeps working for 6–8 hours with no internet, then syncs when the connection returns.

**Two things make this feasible (both verified):**

1. **Pricing already runs in the browser.** `priceCart()` is a pure function — no React, no
   database — and the billing screen already calls it for the live total
   (`billing-screen.tsx:48`). All of `src/lib/accounting/` is pure and can run client-side as-is.
2. **There is only one counter device** (spec §10.5: *"One Manager at the counter; one Day Close
   per day"*). A single writer means the hardest problem — conflicting writes from two devices —
   does not exist here.

**Problems still to solve:**

| Problem | Why | Likely approach |
|---|---|---|
| Bill numbers | The database assigns them (`generatedAlwaysAsIdentity`) | Local number + device id offline; real number assigned in order on sync |
| Trusting prices | The browser would compute them | The server re-checks against its own catalog on sync |
| Day Close | 6–8 hours offline can cover a whole day | Allow an offline close; compute the security code on sync |
| Duplicates | A retried sync could insert the same bill twice | A local unique id per bill that the server matches on |
| Catalog | Services, prices, staff and customers must be in the browser | Sync down whenever online |

**What to build:** PWA (manifest + service worker), IndexedDB in the browser, a sync queue, and an
offline path for day close.

**Size:** very large (2–3 weeks) · **Depends on:** all of P0, and P2.1

---

## P3 — Remaining spec features

| | Item | Size |
|---|---|---|
| ⬜ P3.1 | **Give a bonus** — `khata_kind` already has `bonus` and the accounting handles it, but nothing can create one. Dead path | small |
| ⬜ P3.2 | **Customer special-rates screen** — read during billing, but there is no way to set them. They only arrive via seed | medium |
| ⬜ P3.3 | **Staff monthly receipt** (spec §6.4) — print + WhatsApp | medium |
| ⬜ P3.4 | **Next-month adjustment for a closed month** (spec §7.4) — today it is only blocked | medium |
| ⬜ P3.5 | **Real alert to the Owner on 3+ cancellations** — today it is only a note on screen | small |
| ⬜ P3.6 | **Receipt printing / thermal printer** | medium |
| ⬜ P3.7 | **Proper backup and restore** | medium |
| ✅ P3.8 | **Customer's last visit on the billing screen** (spec §5.1) — done 2026-09-22. See below | small |

### ✅ P3.8 — Customer's last visit on the billing screen
**Done:** 2026-09-22

Spec §5.1 says the phone lookup "loads visit history". Only half of it was built: the customer
strip shows a visit **count** and the **date** of the last one, but never what the customer
actually had done. The counter has to open the Daily report of that date and hunt for the bill.

The data is already there — `bills` and `bill_lines` since migration `0000`. **No migration is
needed**; there is simply no query for it.

**Client decisions (2026-09-22), asked before building:**

| Question | Answer |
|---|---|
| How many visits? | **The last one only.** Not a list of three, not a full-history dialog. The billing strip stays compact |
| Show who did the work? | **Yes** — the staff member's name beside each service. In a salon the customer asks for the same karigar |
| Cancelled bills? | **Do not count them at all** — neither in the visit count nor as the last visit |

That last answer fixes an existing defect, not just the new screen: `customerInfo()` in
`src/features/billing/queries.ts` excludes reversal bills (`isNull(bills.reverses_bill_id)`) but
**not cancelled ones**, so a cancelled bill has always counted as a visit. It is in scope because
the same query is being rewritten, and because showing a cancelled bill's services as "what they
had last time" would be plainly wrong.

**What was built:**

- `types.ts` — the flat `lastVisit: string | null` on `CustomerInfo` became a `LastVisit` object:
  business date, bill number, total, and the lines (name, amount, staff name).
- `queries.ts` — `customerInfo()` now runs the visit count and the last-visit lookup through one
  shared condition, `realVisit()`, so the two can never disagree about what counts. The lines come
  from a second query joined to `staff` for the names, and are ordered by name, the same choice the
  developer's edit screen makes.
- `last-visit.ts` — the pure part: `lastVisitOf()` builds the visit and **sums the total from the
  lines** rather than reading the bill's `cash + online`, so the figure on screen always matches the
  list directly above it; `visitLabel()` gives "1 visit" / "3 visits" / "No visits yet".
- `customer-box.tsx` — the found-customer strip grew a bordered section under the name. It is not
  a dialog: the counter reads it while the customer is standing there.
- `last-visit.test.ts` — 8 tests. **192 pass** (was 184), lint clean, build passes.

**No migration.** `bills` and `bill_lines` have held this since `0000`; there was simply no query.

**Verified in the browser**, signed in as the Owner, against the dev database — not only in tests:

1. Looked up `03001234567` (Ashfaq Bhai, no bills): **"No visits yet"** and **"No earlier visit to
   show."** The Special rate badge still shows, so the rest of the lookup was not disturbed.
2. Saved bill #15 for him on 24 Sep — Haircut (Sherry) Rs 1,500, Hair wash (Arshad) Rs 300.
3. Looked him up again: **"1 visit"** — singular — and `Last visit · 24 Sep 2026 · Bill #15
   Rs 1,800` over the two lines with their staff names. The Rs 1,500 proves the total follows the
   **special rate actually charged**, not the Rs 800 list price.
4. Cancelled #15, looked him up once more: back to **"No visits yet"**. Measured in SQL at the same
   moment: the old condition counted **1**, the new one counts **0**.

**A cancelled bill used to count as a visit.** `customerInfo()` excluded reversal bills but not
cancelled ones. Fixed here because the same query was being rewritten, and because showing a
cancelled bill's services as "what they had last time" would have been plainly wrong.

**Deliberately left alone:** only the last visit is shown, not a history. The client was asked and
chose the compact strip over a three-visit list or a full-history dialog. `bills.book_no` is not
shown either — the bill number is enough to find the bill.

**Noticed while verifying, not fixed here:** `lookupCustomerAction` took 1–5 seconds against Neon.
It is now 4 queries instead of 2, and **no financial table has an index on `business_date` or on
`bill_lines.bill_id`**. Worth a small migration; it is not in this backlog yet.

**Size:** small · **Value:** high (asked for directly by the client)

---

## P4 — Cleanup (no behaviour changes)

| | Item |
|---|---|
| ⬜ P4.1 | **Make every feature the same shape.** Only 6 of 14 follow the full pattern. The pure-logic files (`summary.ts`, `grid.ts`, `rules.ts`, `alerts.ts`, `feed.ts`, `security.ts`, `summary-text.ts`, `cart-state.ts`) need one convention |
| ⬜ P4.2 | **Rewrite `docs/ARCHITECTURE.md`** — it is currently wrong: it says `db/schema.ts` when the reality is a `db/schema/` folder, and never mentions `db/queries/`, `service.ts` or `types.ts` |
| ⬜ P4.3 | Merge `features/auth` into `features/account` — the names are confusing (`features/auth` vs `lib/auth` vs `features/account`) |
| ⬜ P4.4 | **Delete dead code:** `src/components/coming-soon.tsx`, `src/features/.gitkeep`, `docs/~$iend_Setup_Guide.docx` (a Word lock file), `@neon/env` (unused dependency), `neon.ts` (empty config) |
| ⬜ P4.5 | Move `shadcn` from `dependencies` to `devDependencies` — it is a CLI and bloats the production install |
| ⬜ P4.6 | Add `error.tsx` / `loading.tsx` — a database error currently shows Next's default error page |
| ⬜ P4.7 | Add CI (`.github/workflows`) so build + 192 tests + lint run on every push. **More valuable now that two people share `main`** |
| ⬜ P4.8 | Remove the hardcoded `--env-file=.env.local` from the seed scripts in `package.json` — it makes seeding a live database awkward |
| 🟡 P4.9 | **Index the financial tables.** Only 4 indexes exist, three of them on the auth tables. Every query that filters on `business_date` does a sequential scan. See below |

### 🟡 P4.9 — Index the financial tables
**Owner:** Sakib543, 2026-09-22

Measured, not guessed: `src/db/schema/` defines **4 indexes** — `session_user_id_idx`,
`account_user_id_idx`, `verification_identifier_idx` and `customers_phone_key`. Three of the four
belong to Better Auth. **Not one financial table is indexed.** Postgres does not index a foreign
key by itself, so `bill_lines.bill_id` — joined on nearly every screen — has nothing either.

Noticed while building P3.8: the customer lookup took 1–5 seconds against Neon.

Pages run 5–11 queries each, and the ones that matter all filter the same way: `business_date` for
a day, `bill_id` for a bill's lines. At today's volumes a sequential scan is still fast, so this is
not urgent — but it is the cheapest performance work in the backlog, and it gets more expensive to
add once there is real data to lock.

**Only tables that grow are indexed**, and only where a query actually asks for it:

| Index | Serves |
|---|---|
| `bills (business_date, bill_no)` | the day's bills, in receipt order — both the filter and the sort |
| `bills (customer_id)` | the customer lookup and its last visit (P3.8) |
| `bill_lines (bill_id)` | the hottest join in the app |
| `cash_entries (business_date, created_at)` | a day's folder entries, in creation order |
| `khata_entries (business_date)` | day close and `resettleDay` |
| `audit_log (created_at)` | the developer's log, newest first, paginated |
| `audit_log (action, target, created_at)` | the wrong-PIN and wrong-password lockout counters |

**Deliberately not indexed**, each for a reason:

- `month_closes.month`, `day_snapshots.business_date`, `business_days.business_date`,
  `bill_cancellations.bill_id` — already primary keys. `attendance` has a composite key led by
  `business_date`. `customers.phone` and `session.token` are already unique.
- `bill_lines.staff_id`, `cash_entries.staff_id` — only ever joined **to** `staff.id`, which is
  the primary key doing the lookup. An index on this side would never be read.
- `monthly_expenses.month`, `partner_drawings.month`, `capital_repayments.paid_on` — these tables
  gain a handful of rows a month. A sequential scan will still be faster than an index for years.
- `khata_entries.staff_id` — the Staff khata screen reads the **whole** table (`queries.ts:46`) and
  groups in memory. No index helps that; splitting the query is separate work.

**No behaviour changes.** Adding an index cannot alter a result, only the time it takes.

**Size:** small · **Value:** medium (high once there is real data)

---

## P5 — Deployment

| | Item |
|---|---|
| 🟡 P5.1 | **Go live on Vercel** — env vars, then migrate + seed on the Neon `live` branch. The build itself already passes (verified). **Blocked on access, not on code:** the Vercel project exists and is connected to this same repo, but it lives in the **other developer's** Vercel account (answered 2026-09-22). Nobody here can open Settings to set the environment variables. First step is to be added to that project, or to have it transferred |
| ✅ P5.2 | **`docs/DEPLOY_VERCEL.md` rewritten** — done 2026-09-22. It now has the two steps it never had (`db:migrate` and `db:seed` against the live branch, with the commands), in both bash and PowerShell. Fixed as well: the stale "staff with PINs" line (P1.0 removed it), a warning never to run `db:seed:sample` on live, that a push to `main` deploys by itself so a migration must reach live first, that a green build means nothing because the build passes with no env vars at all, and a measured table of which variable is read where. `.env.example` also said `DATABASE_URL_UNPOOLED` was used by the seed scripts — it is not, they read `DATABASE_URL`, and seeding the wrong database is exactly the mistake that comment invites |
| ⬜ P5.3 | **Move to a VPS** — after the client signs off. Postgres on the same VPS; carry the trial data over with `pg_dump` |

---

## Client decisions (2026-09-22)

| Question | Answer |
|---|---|
| Manager's limit | ✅ View only, cannot edit — only the Owner. **Already works this way** (P1.3) |
| Offline | ✅ Real offline needed — 6–8 hours without internet, then automatic sync (P2.2) |
| Developer role | ✅ Built 2026-09-22 (P1.1) — reset passwords, one-click site shutdown, sees the audit log. Hidden from the Settings screen at the client's request: they sign in with a username and password, and nothing else shows the role exists |
| Staff (karigar) PIN | ✅ Remove from the whole project (P1.0). **The Owner PIN stays** |
| Confirmation for staff payments | ✅ No replacement wanted |
| Developer editing financial entries | ✅ Built 2026-09-22 (P1.6) — a bill and its lines only, never deleted, always audited. The triggers stay on: the hatch is one transaction-local setting, and it cannot open `audit_log` |
| Owner editing a bill | ✅ Open day only (P1.4). A closed day's bill can only be cancelled, not edited |
| An edited bill's marker | ✅ Yes — the Daily report's single line carries an "edited" badge **with a link to the previous version** (P1.5) |

## Still to ask

1. **Which Vercel account owns the project?** It exists, and it is connected to this same repo —
   but it sits in the other developer's Vercel account. Somebody has to be given access before
   P5.1 can move. (The "does it exist" half was answered 2026-09-22.)
2. **Can Day Close happen offline?** If there is no internet at closing time, may the manager close
   the day offline, or must they wait? Needed for P2.2 — the security code needs the full day's
   data in order.
3. **What bill number goes on an offline receipt?** The plan is a temporary number (`T-5`) that
   becomes real (`#127`) on sync. Acceptable, or must the customer's copy always carry the final
   number? Needed for P2.2.
Questions 2 and 3 are not needed until offline work starts.

## Answered

- **Each developer has their own database** (2026-09-22). A migration or seed run by one does not
  touch the other's data. The migration conflict described in `docs/HANDOFF.md` section 8.1 still
  applies — that one is about the shared `drizzle/meta/_journal.json` file in git.
