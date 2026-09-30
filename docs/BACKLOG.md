# Backlog — what is left to build

The work queue. Higher sections come first. Each item records why it matters, how big it is, and
what it depends on.

**Status:** ⬜ open · 🟡 in progress · ✅ done · ✖ removed (the client does not want it)

**Two developers share this repo and both work on `main`.** Before starting an item, put your name
and the date in its **Owner** line and push that change first, so the other person sees it. See
`docs/HANDOFF.md` section 2 for the full coordination rules.

Last updated: 2026-10-01 (**P7.5 done — Day close's "Paid today" selects its pre-filled earning on focus and asks before paying more than is owed; expected cash below zero is an error on the screen and the server, not "Extra"; money boxes read whole rupees strictly (`parseRupees`) in Day close and Billing instead of cutting 1500.7 to 1500; a reload carries on from the step it was at (`sessionStorage`). No migration.** Earlier, 2026-09-30: **P7.4 done — partner shares are added and compared in whole hundredths of a percent by one check (`checkShares`) that `partnerShares` also uses, and a share takes at most two decimals, so no shares the Save accepts can crash the Partners page or Month close; found with it, a day with no staff could not be closed. No migration.** Earlier: **P7.3 done — a correction to a closed day is settled on that day's own staff list and pay, saved on `attendance` at close (migration `0022`, applied to live before the push); the QA-04 scenario now leaves 500 / 700 / 500 / 0 instead of 1,000 / 900 / 0 / 1,000.** Earlier: **P7.2 done — one cancellation per row in the database (unique `voids…` on three tables), installments and fixed monthly amounts worked out one at a time under a row lock, and a client id on every Owner money form (`saveOnce`), so a double press or a retried Save saves once. Migration `0021`, applied to live before the push. Verified on restored copies of live, with and without the constraints.** Earlier: **P7.1 done — cancelling the Owner's cash (taken or added) needs the Owner's PIN, whoever is at the screen; the PIN check runs one at a time under an advisory lock, so 20 sent at once check 5; only an open Owner's PIN counts, and whose it was goes to the audit log. No migration. Verified on throwaway local databases, never live.** Earlier: **P7 added — the QA audit's 44 findings as 18 items, P7.1–P7.9 before the trial (two Critical: a Manager can cancel the Owner's PIN-confirmed cash, P7.1; re-settling a closed day uses today's pay rates, P7.3). Nothing was built; the audit changed no code and never touched live. Four questions for the client added to "Still to ask".** Earlier the same day: **P1.10 done — a developer's change to a bill in a closed month now works the month's saved report and the partners' shares out again: only the days move, the salaries and share percentages stay as closed; `month.recalculate` in the audit log; no sign of it on the Owner's screens (the user, 2026-09-30: a note built first was removed, and a developer's account shows as "System" on the adjustments card); the developer's screen lists the month's adjustments so nothing is counted twice. No migration. Found and fixed with it: such a change on a month's last day took the month's salaries out of the khata, and its khata label named the developer.** Verified against a restored copy of live. 2026-09-29: **P3.3 done — the staff salary slip: a PDF per karigar per month, downloaded from Staff khata, with the month's totals, day by day, and room to sign; final once the month is closed, provisional before. P3.5 removed, and with it every plan to send anything on WhatsApp or SMS: the Day close "WhatsApp summary" preview is gone. The client's other answers the same day: the Customers screen stays the Owner's alone; a developer's edit in a closed month is to recalculate the month — P1.10, not built yet.** **P3.7 closed — the user accepted the two local restores as spec phase 4's "restore from backup verified"; no restore into Neon; `docs/BACKUP.md` records them; a schedule moved to P5.3.** **P3.4 done — an adjustment for a closed month: recorded by the Owner from the closed month's Monthly report, counted in the open month's profit (and so its partners' shares) and in the staff khata for staff pay; the closed month is never touched. Four kinds — a sale, an expense, what a staff member earned, what a staff member took. Migration `0020` (`month_adjustments`, append-only), applied to live before the push. Found and fixed with it: a month can no longer be closed before its last day is closed.** Verified against a restored copy of live. **P2.2f done — Day Close offline: the five steps worked out in the browser, the close kept in the outbox behind the day's bills and entries and sent when they have gone, the security code made by the server, which closes the day only if its expected cash matches. No migration. The online close holds back while this computer has any of the day; both copies refresh the moment the business day changes. P2.2 is complete.** Verified against a restored copy of the live database — nothing written to live. P2.2e done — expenses and staff advances offline, in the outbox beside the bills; `cash_entries.client_id` (migration `0019`); a copy of the open day in the browser; `/offline-folders` and `/offline-register`; the register shows bills still on this computer. Only P2.2f (Day Close offline) is left of P2.2. P2.2d done — the counter bills offline: `T-` slips, `/offline-billing`, 12 hours per sign-in, every customer in the offline copy. 2026-09-28: P2.2c done — the outbox and its sync; nothing queues a bill until P2.2d. It no longer waited on a dev Neon branch — the user's call. P3.16 done — the customer box starts empty after a save. P2.2b done — the catalog copy in IndexedDB. P3.15 done — `bills.client_id`, one bill per id; P3.16 found. 2026-09-26: P2.2 split into P2.2a–f with the client's offline answers; P2.2a done. P6.7 and P6.8 done. 2026-09-25: P1.9, P6.3, P4.11, P6.4, P6.5, P6.6, P3.12, P3.13 and P3.14 done. 2026-09-23: P6.1, P6.2, P1.7 and P1.8 done; P0 and P1 complete; P2.1, P3.1, P3.2, P3.6, P3.8, P3.9, P4.2, P4.4, P4.5,
P4.6, P4.7, P4.8, P4.9, P4.10, P5.2 done; P4.1 and P4.3 done 2026-09-23; P3.7 half done)

---

## Item index

| ID | Item | Status | Owner |
|---|---|---|---|
| P0.1 | Show the real login error | ✅ | done 2026-09-22 |
| P0.2 | Reopen a closed day (Owner) | ✅ | done 2026-09-22 |
| P0.3 | Cancel a bill/entry in a closed day (Owner) | ✅ | done 2026-09-22 |
| P0.4 | Stale session cookie locks a user out | ✅ | done 2026-09-22 |
| P1.0 | Remove the staff PIN | ✅ | done 2026-09-22 |
| P1.1 | Developer role (super admin) | ✅ | done 2026-09-22 |
| P1.2 | Users screen — create admins | ✅ | done 2026-09-22 |
| P1.4 | Owner edits a bill on the open day | ✅ | done 2026-09-22 |
| P1.5 | Owner's edit leaves one line, not three | ✅ | done 2026-09-22 |
| P1.6 | Developer edits a financial entry | ✅ | done 2026-09-22 |
| P1.3 | Manager's limit | ✅ | no change needed |
| P2.1 | Paper bill-book number | ✅ | done 2026-09-22 |
| P2.2 | Offline PWA + sync — split into P2.2a–f below | ✅ | done 2026-09-29 (all six) |
| P2.2a | PWA foundation: manifest, service worker, offline banner, persistent storage | ✅ | done 2026-09-26 |
| P2.2b | Catalog copy in IndexedDB | ✅ | done 2026-09-28 |
| P2.2c | Outbox + sync endpoint (built against this database — no dev branch, the user 2026-09-28) | ✅ | done 2026-09-28 |
| P2.2d | Billing offline, `T-` numbers on the receipt | ✅ | done 2026-09-29 |
| P2.2e | Folders / cash entries offline, the Register with local bills (migration `0019`) | ✅ | done 2026-09-29 |
| P2.2f | Day Close offline, the security code on sync (no migration) | ✅ | done 2026-09-29 |
| P3.1 | Give a bonus | ✅ | done 2026-09-23 |
| P3.2 | Customers screen — edit, and set special rates | ✅ | done 2026-09-23 |
| P3.3 | Staff monthly salary slip — a PDF to download, nothing sent (redefined by the client 2026-09-29) | ✅ | done 2026-09-29 |
| P3.5 | Real alert to the Owner on 3+ cancellations | ✖ | **removed** 2026-09-29 — the client does not want it, nor anything sent on WhatsApp or SMS |
| P3.4 | Next-month adjustment for a closed month (migration `0020`) | ✅ | done 2026-09-29 |
| P3.10 | Discount on a bill | ✅ | done 2026-09-23 |
| P3.11 | Price ranges: pick the amount at billing | ✅ | done 2026-09-23 |
| P3.7 | Backup and restore | ✅ | done 2026-09-29 — restored twice into a local copy; the user accepted it, no Neon restore |
| P3.9 | Audit failed logins (spec §11) | ✅ | done 2026-09-23 |
| P3.6 | Receipt printing | ✅ | done 2026-09-22 |
| P3.8 | Customer's last visit on the billing screen | ✅ | done 2026-09-22 |
| P4.1 | One shape for every feature, checked by a test | ✅ | done 2026-09-23 |
| P4.3 | Merge features/auth into features/account | ✅ | done 2026-09-23 |
| P4.2 | Rewrite docs/ARCHITECTURE.md | ✅ | done 2026-09-23 |
| P4.4, P4.5, P4.8 | Dead code · shadcn to devDeps · seed env flag | ✅ | done 2026-09-23 |
| P4.6 | error.tsx / loading.tsx | ✅ | done 2026-09-22 |
| P4.7 | CI on every push | ✅ | done 2026-09-22 |
| P4.9 | Index the financial tables | ✅ | done 2026-09-22 |
| P4.10 | Staff khata reads the whole ledger table | ✅ | done 2026-09-22 |
| P5.1–P5.3 | Deployment | 🟡 | P5.2 done 2026-09-22 |
| P6.1 | Design system + responsive shell | ✅ | done 2026-09-23 |
| P1.7 | The developer can reset their own password | ✅ | done 2026-09-23 |
| P1.8 | Only the developer sets passwords · the eye on every password field · the developer names their own account | ✅ | done 2026-09-23 |
| P6.2 | The salon's real logo, everywhere | ✅ | done 2026-09-23 |
| P1.9 | One seed script, and it creates only the developer | ✅ | done 2026-09-25 |
| P1.10 | A developer's edit in a closed month recalculates its report and the partners' shares (the client, 2026-09-29) | ✅ | done 2026-09-30 |
| P6.3 | Tidy the login page after `5313fc3` | ✅ | done 2026-09-25 |
| P4.11 | `db:check` counts migrations against the repo, not a hardcoded 16 | ✅ | done 2026-09-25 |
| P6.4 | One way to ring up a bill, and the register inside the Daily report | ✅ | done 2026-09-25 |
| P6.5 | A calmer Daily report | ✅ | done 2026-09-25 |
| P6.6 | Today's bills, as calm as the Daily report | ✅ | done 2026-09-25 |
| P3.12 | "Other" on a bill: extra work at whatever the counter charges | ✅ | done 2026-09-25 |
| P3.13 | Re-opening a discounted bill takes the discount off twice (found in P3.12) | ✅ | done 2026-09-25 |
| P3.14 | A corrected bill keeps its deals' split | ✅ | done 2026-09-25 |
| P3.15 | A dropped connection never leaves a bill in doubt — one id per bill, saved once | ✅ | done 2026-09-28 |
| P3.16 | The customer box keeps the last bill's number after a save (found in P3.15) | ✅ | done 2026-09-28 |
| P6.7 | Folders and Staff khata tables on a phone | ✅ | done 2026-09-26 |
| P6.8 | Login footer back at the bottom · BrandLockup comment · dark mode removed | ✅ | done 2026-09-26 |
| P7.1 | Owner cash: cancelling it needs the Owner's PIN (QA-02 **Critical**, QA-07, QA-10) | ✅ | done 2026-09-30 |
| P7.2 | One reversal per cancellation, enforced by the database; repayments locked (QA-03, QA-25) — migration `0021` | ✅ | done 2026-09-30 |
| P7.3 | Re-settling a closed day uses that day's pay and attendance (QA-04 **Critical**) — migration `0022` | ✅ | done 2026-09-30 |
| P7.4 | Partner shares: one check everywhere; Partners never crashes (QA-06) | ✅ | done 2026-09-30 |
| P7.5 | Day close payouts and money fields: no silent typos (QA-29, QA-14, QA-31) | ✅ | done 2026-10-01 |
| P7.6 | Scripts never reach live by accident (QA-01) | 🟡 | Sakib543, 2026-10-01 |
| P7.7 | Next.js 16.3.6 (QA-36, critical advisory) | ⬜ | before the trial |
| P7.8 | Security code: deterministic, survives corrections, actually checked (QA-05, QA-26, QA-27) | ⬜ | before the trial (part) |
| P7.9 | Integration tests against a real database, and a CI gate (QA-43) | ⬜ | before the trial |
| P7.10 | Paper book numbers and `T-` numbers never collide unnoticed (QA-28, QA-37) | ⬜ | next |
| P7.11 | The error screen stops blaming the database (QA-30) | ⬜ | next |
| P7.12 | Sign-in rate limit that holds, and throttled attempts in the audit log (QA-34) | ⬜ | next |
| P7.13 | The offline day copy gives the Manager only what a close needs (QA-08) | ⬜ | next |
| P7.14 | Database hardening: TRUNCATE, the app's role, the hatch, day tables (QA-12, QA-23, QA-24) — migration | ⬜ | next |
| P7.15 | Staff khata one month at a time (QA-42) | ⬜ | next |
| P7.16 | README and HANDOFF statements that are not so (QA-20) | ⬜ | next |
| P7.17 | Small UX, accessibility and header fixes (QA-13, 21, 32, 35, 38, 39, 40, 41) | ⬜ | when convenient |
| P7.18 | Code health and test-suite gaps (QA-15, 16, 17, 18, 22, 33, 44) | ⬜ | when convenient |

---

## P7 — From the QA audit (2026-09-30)

A senior-SQA audit ran nine phases — baseline, accounting core, database integrity, business flows,
dates, authorization and security, offline, UI and accessibility, performance, test quality — against
a **throwaway local PostgreSQL only**. Live was never connected to and the repository was not changed.
About 350 checks; 44 findings (2 Critical, 6 High, 16 Medium, 19 Low, 1 Info).

**Full report** — every finding with steps, expected/actual, evidence and a fix, 328 test cases, the
README claims check and a 124-row traceability matrix: https://claude.ai/artifact/4P8fNtRv9uMu4kx4y1tVrH
(private: ask Sakib543 to share it). `QA-nn` below are that report's finding ids. Each item here carries
enough to reproduce without it.

**Verdict:** rating C+ (6/10). The pure accounting core, authorization (all 46 Server Actions allow or
refuse exactly as the role matrix says), the append-only triggers against UPDATE/DELETE, exactly-once
saving, the one-counter offline design, dates in any server time zone, the responsive layout and speed
with a year of data (18k bills) all held. **Conditional GO for the parallel-run trial once P7.1–P7.9 are
done**; the paper register should not be retired before then. Until P7.8 is done, the Owner writes each
day's security code on paper.

### Before the trial

#### ✅ P7.1 — Owner cash: cancelling it needs the Owner's PIN
**Done 2026-09-30** · **Findings:** QA-02 (Critical), QA-07, QA-10 · no migration

**What was built.** The user said "P7.1 shuru karo" and left the choices to Claude; the recommended ones
were taken:

- **Cancelling "Owner took" or "Owner added" needs the Owner's PIN, whoever is at the screen** — the
  same rule as making one (the Manager, the Owner and the developer alike), not "Owner-only". `voidEntry`
  (`features/folders/service.ts`) asks for it after every other check, so a PIN is never spent on a
  cancellation refused for another reason; `voidSchema` takes an optional `pin`; the Cancel dialog
  (`entries-table.tsx`) shows an "Owner's PIN to confirm" field for those two kinds only and clears it
  after a refusal. An expense or a staff advance is still cancelled on a reason alone. The rule is one
  function, `isOwnerCash` (`lib/accounting/folders.ts`). The cancellation row now carries
  `pin_confirmed = true` (the security code does not hash that column), so the list shows "PIN confirmed"
  on it as on the entry.
- **The PIN check runs one at a time** (QA-07): `confirmOwnerPin` (`db/pin-guard.ts`, replacing
  `confirmPin`) counts the wrong tries, checks the PIN and records a wrong one inside one transaction
  holding `pg_advisory_xact_lock(hashtextextended('pin:owner', 0))`, and throws only after it commits, so
  the record is never rolled back. Everything in it runs on that transaction's connection — a second one
  taken from the pool of 5 while waiting on the lock could run it dry.
- **Only an open Owner account's PIN counts, and any open Owner's does** (QA-10), tried in the order the
  accounts were made. Whose it was goes to the audit log as `after.pinOf` on `folder.owner_took`,
  `folder.owner_added`, `folder.cancel` and `folder.cancel-closed-day`. The screens do not show it (it
  would need a column). With no open Owner holding a PIN: "No PIN has been set for the Owner. The Owner
  sets one in Settings." Wrong tries are still counted together for every Owner (`pin.wrong`, target
  `owner`), as before.

**Verified** against throwaway local databases only (trap 8.20's cluster, fresh migrations and a scratch
setup — live was never connected; all three URLs overridden, trap 8.24). HEAD's code, copied to the
scratchpad, first reproduced all three: the Manager cancelled "Owner added Rs 5,000" with no PIN
(expected cash 11,300 → 6,300); a closed Owner's PIN (made first) was accepted and the open Owner's
refused; 20 wrong PINs at once were all checked (21 `pin.wrong` rows). The new code: no PIN, a wrong PIN
and the closed Owner's PIN refused, expected cash unchanged at 11,300; the open Owner's PIN cancels, with
`pinOf` in the audit and `pin_confirmed` on the cancellation; an expense still cancels with no PIN; 20
wrong PINs at once → 5 checked ("Wrong PIN") and 15 refused as locked, then the right PIN refused as
locked. In the browser, as the Manager against the local database: the dialog shows the PIN field for
Owner cash and not for an expense; blank → "Enter the 4-digit PIN", wrong → "Wrong PIN" (field cleared),
right → cancelled. 694 tests, lint and build pass.

**Not covered:** cancelling the Owner's cash in a *closed* day has no screen (Daily folders lists the
open day only); the service asks for the PIN there too, through the same lines. A browser tab left open
from before the deploy has no PIN field: its Cancel on Owner cash is refused, and a reload brings the field.
`confirmOwnPassword` (`features/account/service.ts`, the password that confirms a PIN change) has the same
count-then-check shape as QA-07 had; it is reached only by a signed-in Owner, and was left for P7.18.

The finding as the audit wrote it:

- **QA-02.** `voidEntry` (`features/folders/service.ts:197-251`) never asks for a PIN, and
  `voidEntryAction` is `requireUser` (`features/folders/actions.ts:23-24`). A Manager cancels an
  "Owner added Rs 5,000" entry with any 3-letter reason; expected cash drops by 5,000, so 5,000 can
  leave the drawer and the count still matches. Reproduced through the service (expected cash
  36,275 → 31,275) and in the browser (the "PIN confirmed" row shows Cancel; the dialog asks only a reason).
  **Fix:** `confirmPin` for `owner_took`/`owner_added` cancellations (or Owner-only), on the screen and the service.
- **QA-07.** `confirmPin` counts earlier failures, then verifies (`db/pin-guard.ts:25-41`): 20 wrong
  PINs sent at once were all checked (21 `pin.wrong` rows, none met the lock). **Fix:** serialise
  (advisory lock on the subject, or a counter row updated in the same statement).
- **QA-10.** The PIN is read with `where role='owner' limit 1` (`folders/service.ts:66`) — no order,
  no `active` filter; with a second Owner the PIN checked is arbitrary. **Fix:** active Owners only;
  say whose PIN.
- **Verify:** as Manager, cancelling Owner cash without the PIN is refused (service and screen); 20
  parallel wrong PINs leave ≤ 5 checked.

#### ✅ P7.2 — One reversal per cancellation, enforced by the database
**Done 2026-09-30** · **Findings:** QA-03 (High), QA-25 (High) · **migration `0021`**, applied to live before the push

**What was built.** The user said "P7.2 shuru karo" and left the choices to Claude; the recommended ones
were taken:

- **One cancellation per row, in the database** (QA-03): `cash_entries.voids_entry_id`,
  `partner_drawings.voids_id` and `monthly_expenses.voids_id` are unique (plain `UNIQUE`, as
  `month_adjustments.voids_id` already was; NULLs do not clash). `voidEntry`, `voidDrawing` and
  `voidOther` keep their "already cancelled" check for the common case and turn a violation of *that*
  constraint into the same message — `isUniqueViolation(error, constraint)` now takes a name, so a clash
  elsewhere in the transaction (a closed day's re-settle) is not reported as "already cancelled".
- **Installments are checked one at a time** (QA-25): `addRepayment` claims the partner's
  `capital_contributions` row `FOR UPDATE` inside its transaction, then reads what is repaid and checks it.
  A row lock does not fire the append-only trigger.
- **A fixed monthly amount is worked out one save at a time**, found on the way: `setFixedAmount` read the
  month's total outside any lock, so five saves of Rs 5,000 at once wrote Rs 25,000 (measured with HEAD's
  code). It now claims the `fixed_expense_lines` row `FOR UPDATE` and reads the total inside. No client id:
  it sets a figure, so saving it twice adds nothing.
- **A client id on every Owner money form** — an investment, an installment, a drawing, an "other"
  monthly expense, a bonus and an adjustment: `client_id uuid UNIQUE` on `capital_items`,
  `capital_repayments`, `partner_drawings`, `monthly_expenses`, `khata_entries` (bonus lines only) and
  `month_adjustments`. The server side is one helper, `saveOnce` (`db/save-once.ts`): the id is looked up
  before anything else runs — so a repeat is answered even when the first changed what would now be
  refused, an installment that paid off the debt — and a unique violation on it is answered
  `{ alreadySaved: true }`. The screens use `useSaveId` (`components/use-save-id.ts`): the id stays until
  the save is known to have worked (in the two dialogs, until they close). The actions answer `SavedOnce`;
  the bonus's `staffName` and the adjustment's `countsIn` answers were unused and are gone.
- **A dropped connection no longer takes these screens down**: a Save that throws is caught and said
  (`thrownSaveMessage`) — "press it again … it is never saved twice" where a save id makes that true, and
  "not known whether this was saved; check" in the other `FormDialog`s (customers, staff and rates). A
  screen from before a deploy is told to reload.

**Verified** against restored copies of live in a local cluster (trap 8.20) — the only contact with live
was the read-only `pnpm db:backup`, until the migration. Live's copy had no duplicate reversal (4 cash
reversals, all distinct), and `0021` applied to it cleanly. The same new code was raced against a copy
**without** the constraints and one with them (five calls at once, the pool opened first):

| | without the constraints | with them |
|---|---|---|
| 5 cancels of one expense / advance / drawing / other expense | 1 / 5 / 5 / 5 reversals (the advance: 5 khata credits) | 1 each, 1 khata credit; 4 × "already cancelled" |
| the same Save 5 times (drawing, other, bonus, investment, installment, adjustment) | 5 rows each | 1 row each; 4 × `alreadySaved: true` |
| 2 installments of Rs 240,000 against Rs 249,000 owed | HEAD's code: both accepted, Rs 480,000 repaid of 250,000 | 1 accepted, the other "Only Rs 9,000 is left" |
| a fixed line set to Rs 5,000 five times | HEAD's code: Rs 25,000 | Rs 5,000 |

One audit row per saved row. In the browser, as a throwaway Owner on the copy, with the answer to a Save
cut after the server had it (trap 8.13): a drawing and a bonus each showed the dropped-connection message
(the bonus dialog stayed open instead of the error page), and pressing again cleared the form with **one**
row and one audit entry. 695 tests, lint and build pass.

**Not covered:** a Save whose answer was lost and whose fields are then *changed* before pressing again is
answered "already saved" with the first figures — the list shows which (as for folder entries). Two
cancellations of one Owner-cash entry at once still both ask for the PIN; the second is refused after it.

The finding as the audit wrote it:

- **QA-03.** `cash_entries` has no unique index on `voids_entry_id`, and `voidEntry` checks "already
  cancelled" outside its transaction (`folders/service.ts:212-217`). Five concurrent cancels of one
  Rs 700 expense wrote **5 reversals** (expected cash off by Rs 2,800); an advance got 5 reversals and
  5 khata credits. Same for `partner_drawings.voids_id` and `monthly_expenses.voids_id`. Bills (PK on
  `bill_cancellations.bill_id`) and adjustments (`month_adjustments_voids_id_unique`) were safe. A
  plain double click in the browser wrote one (the dialog closes first) — two tabs, two devices or a
  retried request are what trigger it.
- **QA-25.** `addRepayment` reads what is owed, then inserts, with no lock (`capital/service.ts:45-80`):
  two concurrent Rs 240,000 repayments against Rs 250,000 owed were both accepted (Rs 530,000 repaid of
  300,000). Owner money forms (repayment, drawing, monthly expense, bonus, adjustment) have no client id,
  so a double submit saves twice.
- **Fix:** unique partial indexes on the three `voids…` columns (treat the violation as "already
  cancelled"); `SELECT … FOR UPDATE` on the capital item before re-checking; client ids on Owner money
  forms as bills have (P3.15).
- **Verify:** 5 parallel cancels → 1 reversal for each table; 2 parallel repayments never exceed what is owed.

#### ✅ P7.3 — Re-settling a closed day uses that day's pay and attendance
**Done 2026-09-30** · **Findings:** QA-04 (Critical) · **migration `0022`**, applied to live before the push

**What was built.** The user said "P7.3 shuru karo" and left the choices to Claude; the recommended ones
were taken:

- **The terms are kept on `attendance`**, not in a new table or the snapshot: it already holds one row per
  person on the day's list at close, is deleted at a reopen and written again at the next close — exactly
  the life the terms need. Migration `0022` adds `pay_type`, `salary`, `daily_wage`, `commission_rate`
  (nullable, with `attendance_pay_type_chk`); `closeDay` copies them from the staff it closed on.
- **`resettleDay` settles on `loadSettledDay`** (`db/queries/day-data.ts`): the day's bills and entries as
  they stand, and its staff through `settledStaff` (`lib/accounting/day-close.ts`, pure, tested) — the
  saved list on the saved pay and attendance. Someone who joined since is not on it; someone who left
  since keeps that day's wage. Anyone whose work is on the day but who was not on its list (a developer
  moved a line to them) gets commission on their pay now and no wage — they were not marked present.
  `loadDay`, for the day being closed, is unchanged; both share `readDay`.
- **Days closed before P7.3** have no saved terms: they are settled on the staff member's pay at the time
  of the correction, as before — but only for that day's list (so a later joiner still gets nothing, and a
  leaver keeps the wage). No backfill: the live days are sample data, and a copy of today's rates would only
  have guessed.
- **A reopened day closed again** is closed like any day, on the pay in force then (the Day close screen
  shows those figures). Only a correction to a closed day is settled on saved terms.

**Verified** on throwaway local databases (live never connected until the migration). The QA-04 scenario
— 4 Sep closed with Bilal on a Rs 700 wage, Arshad on 10%, Karim on Rs 500; then Bilal → 900, Arshad →
20%, Karim deactivated, Newbie (Rs 1,000 a day) added; the Owner cancels a Rs 1,250 bill of 4 Sep:

| | Arshad | Bilal | Karim | Newbie | staff earned |
|---|---|---|---|---|---|
| HEAD's code | 1,000 (20%) | 900 | 0 (wage lost) | 1,000 | 2,900 |
| P7.3 | **500** (10% of 5,000) | **700** | **500** | **0** | **1,700** |
| P7.3, the day's terms blanked (a day closed before P7.3) | 1,000 | 900 | 500 | 0 | 2,400 |

A close → reopen → close of the next day wrote its three rows again with the pay then (900, 20%, Newbie
1,000; Karim not on it). 700 tests (5 new for `settledStaff`), lint and build pass.

The finding as the audit wrote it:

`resettleDay` (`db/day-settlement.ts:88-163`) re-reads the **current** `staff` rows (`loadDay`,
`db/queries/day-data.ts:43, 60-70`) and treats anyone with no attendance row as present
(`day-settlement.ts:62`). Reproduced: after 4 Sep was closed, Bilal's wage went 700 → 900, Arshad's
commission 10% → 20% and "Newbie" (daily wage 1,000) joined; the Owner cancelled one bill in 4 Sep, and
4 Sep was re-posted with Bilal 900, Newbie 1,000 and Arshad 1,225 instead of 613. A karigar deactivated
since, with no work that day, loses the wage for good. Spec §6.5: rate changes apply forward only.
**Fix:** keep each staff member's pay terms (and attendance, already stored) with the day at close — a
small `day_staff_terms` table, or in the snapshot — and re-settle from those. **Verify:** the scenario
above leaves 700 / 0 / 613.

#### ✅ P7.4 — Partner shares: one check everywhere; Partners never crashes
**Done 2026-09-30** · **Findings:** QA-06 (High) · no migration

**What was built.** The user said "P7.4 shuru karo"; the recommended choices were taken:

- **Shares are added and compared in hundredths of a percent, as whole numbers** — the backlog's "basis
  points" option, not a tolerance: `shareHundredths` (33.33% → 3,333), and `checkShares` is `ok` only when
  they add up to exactly 10,000, none is negative and each has at most two decimals (`hasShareDecimals`),
  which is all `partners.share_pct` keeps. `partnerShares` calls `checkShares` itself and splits by the
  whole-number hundredths, so the screen, its Save, the Partners page, Month close and P1.10's
  `recalculateShares` can no longer disagree. (`lib/accounting/partners.ts`, `month.ts`.)
- **The Save refuses a third decimal** (`saveSharesSchema`: "Use at most two decimals in a share, e.g.
  33.33"), and the share box does not take one as it is typed (`step="0.01"`, a pattern on change).
- **Found on the way: a day with nobody on the staff list could not be closed** — `closeDay` inserted an
  empty `attendance` list and Drizzle throws on that. It is skipped now. Only a fresh database before its
  staff are entered would meet it.

**Verified** on throwaway local databases. HEAD's code: shares 0.01 / 65.4 / 34.59 saved, then the
Partners page's data and Month close both threw "got 100.00000000000001%"; 33.333 × 3 saved as 33.33 × 3 =
99.99 and Month close refused. P7.4: the Partners data rendered and September closed on 0.01 / 65.4 /
34.59 (the loss of Rs 700 split 0 / −458 / −242, adding up); 33.333 refused at the Save. In the browser as a
throwaway Owner: the page with those shares showed "Total 100%" (HEAD: the error page); 33.333 typed a key at
a time stayed 33.33; 33.33 / 33.33 / 33.34 saved; the closed September's page rendered. A day with no staff
closed. 703 tests (3 new), lint and build pass.

The finding as the audit wrote it:

`checkShares` rounds to 2 decimals (`lib/accounting/partners.ts:6`) but `partnerShares` compares the raw
float with `!== 100` (`lib/accounting/month.ts:70-71`). Shares 0.01 / 65.4 / 34.59 save, then the
**Partners page shows the "could not reach the database" error** (digest in the server log: "got
100.00000000000001%") and Month close throws a plain `Error`. Partners is the only screen where shares
are edited, so the Owner cannot put it right in the app. Separately `saveSharesSchema` accepts 33.333
(`partners/schemas.ts:11`) but the column is `numeric(5,2)` (`db/schema/config.ts:112`): saved as 33.33 × 3
= 99.99, then Month close refuses. **Fix:** one tolerance-based check (or basis points as integers);
2 decimals in the schema. **Verify:** any shares the schema accepts render Partners and let Month close run.

#### ✅ P7.5 — Day close payouts and money fields: no silent typos
**Done 2026-10-01** · **Findings:** QA-29 (Medium, P1), QA-14, QA-31 · no migration

**What was built.** The user said "P7.5 shuru karo"; the recommended choices were taken:

- **A money box reads what is typed, strictly** (QA-14): `parseRupees` (`lib/format.ts`) — whole rupees,
  0 or more, blank is 0, anything else (1500.7, -500, 1e3) is null and the screen says so. Used by Day
  close's payments and count and by Billing's discount and split cash/online; the old `toRupees` that cut
  1500.7 to 1500 and -500 to 0 is gone from both. Those boxes are `type="text" inputMode="numeric"` now:
  a number box reports "" for some half-typed values and changes on the scroll wheel.
- **Paid today** (QA-29): the box selects its pre-filled earning on focus, so typing replaces it; a
  payment above what the person is owed (khata balance + today's earning) is asked about once —
  `checkPayouts` / `overOwedText` (`features/day-close/payments.ts`) — and Continue again pays it, since a
  payment may be an advance. Not refused against "the drawer" at step 3: expected cash is hidden until
  the count, and showing the drawer there would undo that.
- **Expected cash below zero is an error, not "Extra"** (QA-29): `drawerBelowZero` in
  `offline-close.ts`; `closeProblem` refuses it on the screen (offline too), the Review step shows it in
  red with no reason box and Close disabled, and `closeDay` refuses it on the server in the same words.
- **A reload carries on** (QA-31): the wizard's answers — step, attendance, payments, count, reason and
  the close's id — are kept in `sessionStorage` per business day (`wizard-state.ts`, `restoreWizard`),
  written as they change and removed once the day is closed or kept offline. A reload on the review goes
  back to the count (expected cash is always worked out afresh). The wizard is drawn after hydration
  (`useSyncExternalStore` with an `undefined` server snapshot), so the server's render and the first
  client render agree. A refused offline close (`start`) opens from itself, never from what was kept.

**Verified** on a throwaway local database, in the browser as a throwaway Owner (live never touched):
typing 1110 into Bilal's pre-filled 1,110 gave 1110 (QA-29 made 11,101,110); 1110.5 → "Enter what was
paid to Bilal in whole rupees"; 5,000 against 1,110 owed → the question, then Continue again went on; a
reload at the count came back at the count with Arshad still absent and Bilal's 5,000 — and again after
the pane itself jumped the tab to Billing; 20,000 paid against an Rs 11,000 drawer → the Review showed
"Expected cash comes to -Rs 9,000…", no "Extra", Close disabled; 1,110 and a count of 9,890 closed the
day (Bilal paid 1,110, Arshad absent) and the kept answers were gone. Billing: discount 300.5 and split
cash 1500.7 each got their message. The server refused a close paying 11,101,110 ("Expected cash comes
to -Rs 11,090,110…"). 729 tests (26 new), lint and build pass.

**Not covered:** clicking into a box that already has focus puts the cursor where clicked, as any text
box does — select-on-focus fires once per focus; the over-owed question is the net for that. The other
money boxes (Folders, Monthly expenses, Capital, Partners, bonus, adjustment) keep their number inputs;
their servers refuse fractions and negatives through Zod, with a message, so nothing there is cut quietly.

The finding as the audit wrote it:

- **QA-29.** A daily-wage karigar's "Paid today" is pre-filled with the day's earning; typing 1110
  into the pre-filled 1,110 made **Rs 11,101,110**. Review then showed expected cash −Rs 11,069,885 as
  "Extra" with the reason optional, and Close day was enabled (`day-close/components/close-wizard.tsx:21,
  104`; the payout schema allows up to Rs 100,000,000, `day-close/schemas.ts:3-6`).
- **QA-14.** `toRupees = Math.max(0, Math.trunc(Number(text) || 0))` (`billing-screen.tsx:38`,
  `close-wizard.tsx:21`) silently turns 1500.7 into 1500 and −500 into 0.
- **QA-31.** Reloading Day close starts over at step 1 with every daily-wage karigar present again.
- **Fix:** select the field on focus (or leave it empty with the earning as a hint); refuse a payout
  above the drawer and confirm one above the khata balance; negative expected cash is an error, not
  "Extra"; refuse fractions and negatives with a message; keep the wizard's state in `sessionStorage`.

#### 🟡 P7.6 — Scripts never reach live by accident
**Owner:** Sakib543, 2026-10-01 · **Findings:** QA-01 (High) · no migration

`drizzle.config.ts:34` and `scripts/backup.ts:28` take `DATABASE_URL_UNPOOLED || DATABASE_URL`, and
`.env.local` sets `DATABASE_URL_UNPOOLED` to the live direct string (HANDOFF §5 said it was empty — it
is not). So `DATABASE_URL=<local> pnpm db:migrate` — the override pattern the README, `backup.ts` and
HANDOFF §7 document — **migrates live**, and `db:backup` backs up live. Checked by resolving the URL
only, with no connection. **Fix:** when `DATABASE_URL` comes from the process environment, ignore the
file's `DATABASE_URL_UNPOOLED` (or require an explicit `MIGRATE_DATABASE_URL`); print the target host and
refuse a non-local one without `--live`. Until then: always override **both** variables.

#### ⬜ P7.7 — Next.js 16.3.6
**Owner:** — · **Findings:** QA-36 · no migration

`pnpm audit`: critical GHSA-vcvr-r3jv-pc5j in next 16.3.5 (RCE in `next/og` ImageResponse; vulnerable
>=16.2.0 <16.3.6). `next/og` is not imported today, so it is not reachable yet. Bump `next` and
`eslint-config-next` to 16.3.6; build, test, lint. (Moderate: esbuild 0.18.20 through drizzle-kit, dev
server only — goes with drizzle-kit's next release.)

#### ⬜ P7.8 — Security code: deterministic, survives corrections, actually checked
**Owner:** — · **Findings:** QA-27, QA-05, QA-26 (High) · no migration for the first two

- **QA-27.** `computeDayCode` reads `bill_lines` with **no ORDER BY** (`db/day-code.ts:39-43`). The same
  day gave 6EE7-B5A9-CBE5 with the default plan and C8F7-FC92-2B17 with merge join or seq scans; a no-op
  rewrite of one line changed it again. An untouched day can fail verification once the table grows,
  after a VACUUM FULL or a repair. **Fix:** order by `bill_lines.id`; re-seal once, old codes to history.
- **QA-05.** A legitimate correction re-seals only its own day; the next day was chained on the old code
  and fails `verifyDayCode` (reproduced for a closed-day cancel and a developer edit). `verifyDayCode` has
  no caller. **Fix:** verify each day against the code it was chained on (history), or re-chain; add a
  Verify screen for the Owner.
- **QA-26.** Changing a 30 Aug line (triggers disabled) failed only 30 Aug — 31 Aug to 3 Sep still
  verified, against the README; recomputing and writing the codes back made every day verify. The hash
  is unkeyed and, since 2026-09-29, sent nowhere. **Fix:** a copy outside the database (printed on the
  close slip, or sent), an HMAC key the database does not hold. **Before the trial:** the Owner notes
  each day's code on paper.

#### ⬜ P7.9 — Integration tests against a real database, and a CI gate
**Owner:** — · **Findings:** QA-43 (High) · no migration

All 693 tests are pure: nothing tests a database write (60+ functions), a trigger (15), a Server Action
(46), a Route Handler (7) or a component. Every Critical and High finding above lives in that untested
code. CI runs lint, test and build but does not gate the deploy. **Do:** a PostgreSQL service container
in CI; migrate; seed through the services; then, in this order: Owner-cash PIN (P7.1); the concurrency
cases (P7.2); the day lifecycle close → rate change → closed-day cancel → reopen → re-close (P7.3); the
role matrix — call all 46 actions directly as each role with `{}` (the role is checked before Zod, so
nothing is written) and assert against a table; shares (P7.4). Then triggers incl. TRUNCATE, the hatch,
the security-code chain, the offline sync routes, month close and slips. Deploy only from a green run.

### Next

#### ⬜ P7.10 — Paper book numbers and `T-` numbers never collide unnoticed
**Findings:** QA-28, QA-37. The same paper number was saved twice silently (`bills.book_no` has no
check). Two devices offline both number from `T-1` (per-device counter, `lib/offline/store.ts`); the
server accepted three `T-1` bills on one day. Device A's offline close reaching the server first makes
device B's bill of that day a 422 "No business day is open", though its cash was in the drawer A
counted. **Fix:** warn on a repeated book number; prefix `T-` with a device code; record a device id on
offline items; tell the Owner when a second device works offline on the open day (the one-device
assumption, spec §10.5, is nowhere enforced).

#### ⬜ P7.11 — The error screen stops blaming the database
**Findings:** QA-30. `components/error-card.tsx:40` always says "The system could not reach the database …
use the paper bill book", even for a code bug (seen on Partners, P7.4). **Fix:** neutral wording;
suggest paper only when the connectivity probe also fails.

#### ⬜ P7.12 — A sign-in rate limit that holds
**Findings:** QA-34. Better Auth's default limiter (no `rateLimit` block in `lib/auth/server.ts`) let
3 wrong passwords through then answered 429 — but the 7 rate-limited attempts wrote **no** `login.failed`
row, and a different `X-Forwarded-For` on each request removed the limit entirely (10 of 10 processed).
Counts live in memory (per instance on Vercel). **Fix:** database storage, the platform's IP header
only, a per-username counter, and an audit row when throttled.

#### ⬜ P7.13 — The offline day copy gives the Manager only what a close needs
**Findings:** QA-08. `/api/offline/day` (`db/queries/day-copy.ts:57-67`) returns to any role the opening
cash, all of the day's bills and entries and every staff member's salary, wage and commission rate — so
expected cash can be worked out before counting (spec §5.4(4)), and staff pay reaches the Manager (§2).
The online Day close page keeps it hidden. **Fix:** send only what an offline close needs; or record the
trade-off with the client.

#### ⬜ P7.14 — Database hardening
**Findings:** QA-23, QA-24, QA-12 · migration. `TRUNCATE` passes every append-only trigger, `audit_log`
included (row triggers do not fire on it). A session-level `SET app.allow_financial_edit = 'on'` from
any connection opens every financial table (only `db/financial-edit.ts` sets it today, with
`is_local = true`, and that was shut after commit, rollback, error and across the pool).
`business_days` (opening cash, `closed_at`) and `attendance` have no trigger; discount, book number,
cancellations, khata, attendance and `diff_reason` are outside the security code. **Fix:** `BEFORE
TRUNCATE` statement triggers; run the app as a role that does not own the tables; make the hatch
require that role; protect `business_days.opening_cash`; hash attendance and the discount fields.

#### ⬜ P7.15 — Staff khata one month at a time
**Findings:** QA-42. With a year of data every screen rendered in 33–85 ms except Staff khata: 210 ms and
**1.4 MB** for one daily-wage karigar (~1,200 lines, rendered as HTML and again as RSC data), growing
~1.3 MB a year. **Fix:** the current month plus the balance brought forward, with month navigation — the
salary slip's shape.

#### ⬜ P7.16 — README and HANDOFF statements that are not so
**Findings:** QA-20. README: `day_snapshots` cannot be deleted (it can, by design since `0009`); "any
sealed day can be re-verified" (no tool); "change a sealed day and the chain after it no longer
verifies" (it does verify — P7.8); "no bug can bypass the triggers" (TRUNCATE, a session SET — P7.14);
"components never talk to the database … a test checks" (it does not — P7.18). HANDOFF §5 and §1 were
corrected with this entry; `CLAUDE.md` still says "600 tests" (693).

### When convenient

#### ⬜ P7.17 — Small UX, accessibility and header fixes
- **QA-40:** `--muted-foreground` `#6b7584` is 4.12–4.27:1 on the greys at 12–13 px (AA needs 4.5:1),
  including the unselected "Online (QR)" / "Split" options. About `#5b6472` fixes it.
- **QA-41:** no "Skip to content": 15 Tab stops before Billing's search (as Owner).
- **QA-32:** a reprint lists lines in another order than the original (`bill_lines` has no position).
- **QA-39:** "Needs attention" does not show the slip's `T-` number; an old "No internet" note stays after
  reconnecting; the fix screen could offer "the customer paid Rs 300 — record Rs 50 as a discount".
- **QA-38:** an offline bill kept without a catalog version is refused as "Rs 50 short" with no word
  that prices changed.
- **QA-13:** a deal made only of zero-priced services throws a plain `Error` (`allocate.ts:9`): empty
  message on screen, "Something went wrong" from the server.
- **QA-21:** the Users form allows `-` in a username (`users/schemas.ts:10-16`); Better Auth refuses it
  (`INVALID_USERNAME`) and the screen says "Something went wrong".
- **QA-35:** no CSP / `frame-ancestors`, `X-Content-Type-Options` or `Referrer-Policy`; `X-Powered-By` sent.

#### ⬜ P7.18 — Code health and test-suite gaps
- **QA-44:** the conventions test misses one action losing its role check (it matches one regex per
  file), a cross-feature import written `../billing/…`, and `@/db` in a component (the build catches
  client components only; 16 server components are unguarded).
- **QA-22:** `loadDay` runs five selects with `Promise.all` on one transaction client
  (`db/queries/day-data.ts:27`); pg warns this will throw in pg 9.
- **QA-18:** `deal_items` is read without ORDER BY and `allocate` breaks ties by position.
- **QA-15:** `countedTotal`, `commissionReversal`, `advanceOutstanding`, `capitalSummary` are tested but
  unused; the cash count by denomination (spec §5.4) was never built — build it or record that it was dropped.
- **QA-17:** `voidEntry` accepts a `staff_payment` but reverses only an advance's khata line.
- **QA-16:** a "Final" salary slip can still change after a developer edit in its month.
- **QA-33:** setting the device clock back after the last sign-in stretches the 12-hour offline window
  indefinitely (`lib/offline/session.ts:31-36`); keep a high-water mark.
- **Found in P7.1:** `confirmOwnPassword` (`features/account/service.ts`) counts wrong passwords, then
  checks, as `confirmPin` did before P7.1 (QA-07) — tries sent at once each pass the count. Only a
  signed-in Owner reaches it (to change the PIN). Serialise it the same way (`db/pin-guard.ts`).

---

## P0 — Before the client trial

Without these, the 20-day trial is likely to get stuck.

### ✅ P0.4 — A stale session cookie locks a user out completely
**Done:** 2026-09-22 · **Found:** 2026-09-22, on the live site

`src/proxy.ts` decides only whether a session cookie **exists**, never whether it is valid — which
is deliberate and documented. But combined with `requireUser()` it forms a loop:

| Request | Result |
|---|---|
| `/login` with an invalid-but-present cookie | proxy sees a cookie → **307 to `/billing`** |
| `/billing` with the same cookie | proxy passes it → `requireUser()` finds no real session → **307 to `/login`** |

Measured against **https://art-man-drab.vercel.app** with `curl`: eight redirects and still going.
A browser shows `ERR_TOO_MANY_REDIRECTS`. **The user cannot reach the login page at all**, so they
cannot sign in to fix it. The only escape is clearing cookies, which a salon manager will not know
how to do — they will simply report that "the system is broken".

**This is reachable from the normal UI, not only from a test.** Anything that deletes a session
server-side while the browser keeps its cookie triggers it:

- **The Owner resets the Manager's password** (`features/account/service.ts:77`) — deletes *every*
  manager session. The counter tablet is then locked out of the login page, so the manager cannot
  use the new password. The feature meant to rescue a forgotten password causes a worse lockout.
- **The developer resets anyone's password** (`features/developer/service.ts:44`) — same.
- **Changing your own password** (`features/account/service.ts:51`) — deletes your other sessions,
  so a second device is locked out.
- Rotating `BETTER_AUTH_SECRET`, or re-seeding the database, invalidates **everyone's** cookie at
  once.

**The fix was one line of behaviour.** `src/proxy.ts` no longer sends anyone away from `/login`;
it only guards the other routes. Nothing else changed.

**The login page needed no change at all.** It already read
`if (await getCurrentUser()) redirect("/billing")` — a *real* session check, against the database.
The proxy had simply been intercepting first, so that line had never actually run. The decision now
sits with the only code that can make it correctly.

**Verified both ways, in a browser and with `curl`, against the dev server:**

| | a real session | a dead cookie |
|---|---|---|
| `/login` | **307 → `/billing`** | **200** (was 307 → `/billing` → loop) |
| `/billing` | 200 | 307 → `/login`, which then renders |
| following redirects from `/login` | settles after 1 | settles after 0 |

The signed-in path was tested with a **real signed-in session**, not a hand-made cookie: a
throwaway `p04test` account was created the way `seed-users.ts` does, signed in through
`/api/auth/sign-in/username` to get a genuine signed cookie, and deleted afterwards. That mattered
— the login page's redirect had never executed before this change, so "it was already there" was
not evidence that it worked.

**`src/proxy.test.ts` — 5 tests, and they were proved to catch the bug**: the old proxy was put
back temporarily and exactly the two that should fail did, including one that walks the proxy's own
redirects and fails if a path repeats. **197 tests pass** (was 192), lint clean, build passes.

**Not done, and worth knowing:** the dead cookie is still sent by the browser until something
overwrites it. It is now harmless — every page simply treats it as signed out — and a successful
sign-in replaces it. Clearing it properly needs a route handler or the proxy, because a Server
Component cannot set cookies.

**Size:** small · **Value:** very high — this locked real users out of a live system

---

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

### ✅ P1.2 — Create admins from inside the app
**Done:** 2026-09-22 · migration `0015_spooky_lilandra`

**Decisions taken with the user before starting:**

- The screen is its own **`/users`** nav item, for the Owner and the developer — not a section
  inside Settings, which is already long and would not hold a list plus a create form.
- **Deactivating needs a migration**: `user` has no `active` column. Deleting an account is never
  an option — `audit_log` ties every action to the actor's username.
- The Owner may create **Manager and Owner** accounts, matching the client's *"an old admin should
  be able to create a 3rd admin"*. The developer role is never offered and developer accounts never
  appear in the list, so the Owner still sees no sign the role exists.

Sign-up is disabled (`disableSignUp: true`) and accounts are only created by `pnpm db:seed`. There
is no screen for it.

**What was built** — `/users`, in `src/features/users/`:

- **Create a login.** Username, name, role and a first password, typed by whoever creates the
  account and read out to the new person. Public sign-up stays off: this goes through the same
  internal adapter `pnpm db:seed` uses, so the only way to get an account is for someone who
  already has one to make it.
- **Reset a password**, which signs that person out everywhere.
- **Close an account, and re-open it.** Never a delete — `audit_log` ties every action to the
  actor's username, and a record whose actor has vanished stops making sense.
- `rules.ts` — who may do what to whom, pure and with **18 tests**. The screen asks it before
  drawing a button and the Server Action asks it again, so a button is never shown for something
  the server would refuse, and hiding a button is never what makes an action safe.

**The guards, and why each one exists:**

| Refused | Because |
|---|---|
| Your own account: closing it | you would be signed out with no way back |
| Your own password, here | Settings asks for the current one and keeps you signed in; this would sign you out mid-click |
| An Owner reaching a developer account | the client asked that the role stay invisible. Filtered **in SQL**, so it never reaches their browser at all |
| Closing the last open Owner | nobody would be left who could open it again. The developer could, but the salon does not know that account exists |

**Closing is enforced in three places**, which is deliberate: the sessions are deleted at once,
`getCurrentUser()` treats a surviving cookie as signed out, and a `session.create.before` hook
refuses the sign-in outright. The hook is what lets the login screen **say** something —
`validateUserInfo` does not run for a username and password, so it is the documented place.

**The login screen needed a new message.** A closed account returns 403, and
`sign-in-error.ts` mapped 403 to *"Wrong username or password."* — sending the person hunting for
a typo that is not there, the exact fault P0.1 fixed. The refusal now carries
`code: "ACCOUNT_CLOSED"` and reads *"This account has been closed. Ask the Owner to open it
again."*

**Two things were fixed on the way:**

- `resetManagerPassword` in Settings picked **whichever Manager row came back first**. Harmless
  while there was exactly one; wrong the moment this item made several possible. It now refuses
  when there is more than one open Manager and points at this screen.
- The "set a password and sign them out" dance existed twice. It is now
  `src/db/user-account.ts`, shared by this screen, the developer's password screen and Settings.

**Verified in a browser**, as the Owner, against the dev database: the developer account is absent
from the list and the word never appears on the page; the role menu offers only Owner and Manager;
a Manager was created and signed in with it; the Manager sees no Users link and is redirected away
from `/users`; the account was closed (sign-in then **403 "This account has been closed."**, and
the login form showed that sentence), re-opened, and signed in again; the password was reset
**three times in a row** and only the newest one ever worked. Every action is in `audit_log` with
actor, target and before/after — and no password is.

**One thing that looked like a bug and was not:** a reset appeared to do nothing. The test session
had been swapped to the Manager account, so the action hit `requireRole("owner")` and redirected.
The guard working, not a fault.

**Not built, deliberately:** changing an existing account's role. Demoting the only Owner is its
own question, and nobody asked for it.

**Not verified:** the last-open-Owner refusal, in a browser. Only a developer can reach that state
(an Owner is stopped by the "not your own account" rule first), and the developer password is not
known here. It is unit-tested.

**222 tests pass** (was 202), lint clean, build passes.

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
bigger decision than this task — raise it with the client if it ever comes up. **The client decided
on 2026-09-29 to recalculate; built as P1.10 (2026-09-30).**

**Size:** large · **Depended on:** P1.1 (done)

---

## P2 — Offline

**Client decision (2026-09-22):** *"Like a proper offline app — if there is no internet for 6–8
hours the app must keep working, and when the connection returns the database updates."*

So **P2.2 is approved.** P2.1 still gets built first: it is a cheap stopgap until P2.2 ships, and
it stays useful whenever the power is out.

### ✅ P1.10 — A developer's edit in a closed month recalculates the month
**Done:** 2026-09-30 · no migration

**Client decision, 2026-09-29, through the user.** When the developer changes a bill in place (P1.6)
in a month that is already closed, the month's saved report and the partners' shares are to be
**worked out again**, not left as they were closed. Until P1.10 they were left (HANDOFF section 9,
question 0), and the developer's screen warned that they no longer matched the bills.

**The user said "haan P1.10 bana do" and left the choices to Claude**; the recommended ones were
taken, and are below.

**What was built:**

- **`recalculateMonthReport(closed, days)`** (`lib/accounting/month-report.ts`). The days' figures
  are read again; the net profit and the Owner account move by what the days moved; everything else
  — the salaries above all — stays as the month closed with it. Decision: a difference on top of the
  saved report, not a rebuild that reads the other inputs again (the plan below allowed either). The
  result is the same wherever those inputs cannot change in a closed month, and nothing but the days
  can move it where they could. Tested against `buildMonthReport` on the corrected days for six
  shapes of month (a bonus, rent the Owner paid, Owner-paid daily expenses, capital repaid, a P3.4
  adjustment) times three corrections (a cash sale lower with its commission, online that was cash,
  a sale higher paid online) — equal every time — plus four named cases.
- **`recalculateShares(closed, netProfit)`** (`lib/accounting/month.ts`): the percentages saved at
  close, in the saved order (a leftover rupee goes by position on a tie). `ClosedShare` is now the
  one type for `month_closes.shares` — Month close writes it, Partners reads it.
- **`editBillRow`** claims the month's `month_closes` row `FOR UPDATE` before anything else, so two
  corrections in one month are worked out one after the other. After `resettleDay`,
  `recalculateClosedMonth` reads the month's snapshots inside the transaction, works the report and
  shares out again and — only if anything moved — updates the row through the hatch, opened for that
  one statement, and writes **`month.recalculate`** to `audit_log` (target the month, `before` the old
  net profit, report and shares, `after` the new ones with the bill's number and day). The bill's own
  `bill.developer-edit` entry gains `monthRecalculated`. A line's name or a book number moves nothing,
  and nothing is written for the month.
- ~~**The note** on the Monthly report and Partners~~ — built, then **removed the same day at the
  user's request** (see "The Owner sees nothing", below). The `month.recalculate` entries stay in the
  audit log, which only the developer reads.
- **The developer's screen**: the red "not recalculated" warning is replaced by what saving now does,
  and the month's P3.4 adjustments are listed — cancelled ones and their cancellations left out — with
  the warning not to change a bill whose mistake one of them already put right. With none, it says so.

**Found and fixed with it:**

1. **A change to a bill on the last day of a closed month took that month's salaries out of the khata
   for good.** Month close dates the "Monthly salary" lines on the month's last business day;
   `resettleDay` reversed every unreversed `earning` line of the day and posted back only commission
   and daily wage. Confirmed on the copy by running the pre-P1.10 `resettleDay` inside a transaction
   that was rolled back: it reversed both salary lines (Rs 40,000 each). It now leaves them alone —
   `isMonthlySalaryLabel` (`lib/accounting/staff-pay.ts`), shared by Month close (which writes the
   label), `resettleDay` and the salary slip.
2. **The khata label named the developer.** The resettle reason was "bill #N edited by the developer",
   which the Staff khata shows the Owner and the Manager as "Corrected: bill #N edited by the
   developer" — against HANDOFF section 6. It is now "Corrected: bill #N changed". Lines already
   written stay (append-only): the live database has them from P1.6's own check of bill #13 on
   2026-09-22, sample data that goes with the fresh database at go-live.

**Verified against a restored copy of live** (HANDOFF trap 8.20) — nothing written to live; its only
contact was the read-only `pnpm db:backup`. The server was proved to be on the copy before the first
write (8.22).

| Check | Result |
|---|---|
| Setup, by script | 24–30 Sep closed, with #44 (25 Sep, Facial Rs 1,800 online, Sherry) and #45 (30 Sep, Haircut Rs 500 Arshad + Hair wash Rs 300 Hamid, cash); September closed — net profit −59,560, shares −29,780 each, salaries 80,000; 1 Oct opened. Then Arshad's salary 40,000 → 45,000, so today's settings disagree with the closed month |
| Developer's screen | "Month closed", the new warning, "No adjustment has been recorded for September 2026" |
| An adjustment for September (sale Rs 100 less, cash) | listed there with the double-count warning; cancelled from October's report, neither row listed any more |
| #45 in the browser: Haircut 500 → 400, cash 800 → 700 | sales 31,600 → 31,500, staff earned 10,360 → 10,350, net profit −59,560 → −59,650, balance with business −61,910 → −62,000, **salaries 80,000** (today's settings say 85,000), shares −29,825 each |
| Khata on 30 Sep | Arshad's commission 50 → 40, the others reversed and posted back the same, **both salary lines untouched**, labels "Corrected: bill #45 changed" |
| Audit | `month.recalculate` for 2026-09, −59,560 → −59,650, bill 45; `bill.developer-edit` with `monthClosed` and `monthRecalculated` true |
| Monthly report and Partners, September | the new figures and shares (and the note, since removed); at 375 px nothing overflows |
| #44 by script: online → cash | net profit unchanged; online 2,650 → 850, cash 28,850 → 30,650, reached the Owner 2,650 → 850, balance −62,000 → −60,200; shares unchanged |
| #44, book number only | nothing written for the month (`monthRecalculated: false`) |
| Stored against a full rebuild (`getMonthlyReport`'s `live`) | they differ only in the salaries, the net profit and the Owner account — by exactly the 5,000 salary change |
| Two edits in September at once | one after the other: −59,650 → −59,740 → −59,695; stored equals rebuilt |
| Security codes, 25 and 30 Sep | recomputed equal to stored (`verifyDayCode`) |
| `update month_closes` outside the transaction | refused — the hatch is shut |

690 tests pass (was 662), lint clean, build passes (37 routes).

**The Owner sees nothing — the user's decision, 2026-09-30.** Asked "developer kuch b changes kry owner
ko kese b jaga pata na chaly", the user was shown every place a change could be noticed and chose:

- **The note is gone** from the Monthly report and Partners. The Owner sees the new figures only.
- **A developer's account is shown as "System"** where the Owner's screens name who did something —
  one place, the adjustments card on the Monthly report ("… · by System"). `recordedBy` in
  `month-adjustments/rules.ts`; the names come from every developer account's username now and, from
  `username.change` in the audit log, every one it had before. **Never another person's name**: the
  user asked for "something else" in place of the developer, and was told a money entry must not carry
  the name of someone who did not make it. The real name stays in the row and the audit log.
- **Left as they are, and said so:** the khata's "Corrected: bill #N changed" lines (needed for the
  balances, and the same as the Owner's own corrections), the day's security code changing (a
  condition of the client's approval of the developer's edit, HANDOFF section 6), and the audit log,
  which nothing can erase. The figures themselves change — that is the recalculation.

Checked: no other Owner or Manager screen prints who recorded anything (`createdBy` / `closedBy` are
shown nowhere else). On a second restored copy of live, three adjustments for September — by the
developer, by the Owner, and by the developer again after renaming the account — came back from
`getAdjustmentsData` as System, owner, System, while the table kept the real names. Not reopened in
the browser: the card prints that value as it is. 693 tests pass, lint clean, build passes.

What building it had to get right (the plan, as written before it was built):

- `month_closes` is append-only through `forbid_change()`. The update belongs inside the
  developer's hatch (`src/db/financial-edit.ts`, the only place that may open it), in the same
  transaction as the bill, with the old report and shares written to `audit_log` as `before`.
- Recompute **only what the edit moves**: the days' snapshots (which `resettleDay` has just
  rewritten). The frozen **salaries** must stay as they were closed — `getMonthlyReport` reads
  today's staff settings, which may have changed since. Bonuses, monthly expenses, Owner cash,
  capital repayments and P3.4 adjustments cannot change in a closed month, so reading them again is
  safe.
- The partners' shares with the **percentages saved at close**, not today's.
- The Owner and the Manager must see no sign of the developer role (HANDOFF section 6). A note on
  the Monthly report can say the month was recalculated after a bill was corrected; it must not say
  by whom.
- A mistake already put right with a P3.4 adjustment must not also be edited in place, or it
  counts twice. Say so on the developer's screen.

Test it on a restored local copy (HANDOFF trap 8.20): close a month, edit one of its bills as the
developer, and read back the month's report, the shares and the audit entry.

**Size:** small to medium · **Value:** medium (rare, but it is money the partners are paid on)

---

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

### ✅ P2.2 — Real offline PWA + sync *(client approved)*
**Done:** 2026-09-29 — all six parts, P2.2a–f. Billing, Daily folders, the register and Day close work with no internet.

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

**Client answers (2026-09-26), through the user:**

| Question | Answer | What it means for the build |
|---|---|---|
| May Day Close happen offline? | **Yes** | The manager counts cash offline; the security code is computed on sync, because it hashes the day's bills in bill-number order |
| What number goes on an offline receipt? | **A temporary number (`T-5`) is fine** | The real `bill_no` is assigned in order on sync. A reserved block of real numbers was offered and not wanted |
| Owner PIN offline? | **Not needed** | Owner cash entries (`owner_took` / `owner_added`) are simply unavailable offline, so no PIN hash is kept on the device |
| How long may an offline login last? | **12 hours**, and it must survive closing the browser and reloading | Trust window counted from the last sign-in the server confirmed; after it, the counter must go online and sign in again |

Offline scope stays Billing, Folders, the Register view and Day Close. Everything else says it needs
the internet.

**Next.js 16's own offline feature (`experimental.useOffline`) is not the answer, and is not
enabled.** Read in `node_modules/next/dist/docs/01-app/02-guides/offline-support.md`: it holds a
failed Server Action in memory and re-sends it when the network returns. Memory dies on a reload,
so it cannot carry eight hours of bills; and re-sending a `createBill` whose response was lost —
not whose request was lost — would save the bill twice. The outbox (P2.2c) is still needed.

**Split into six items, one per session:**

| | Item | Migration | Waits on |
|---|---|---|---|
| P2.2a | PWA foundation: manifest, service worker (the app's files cached, an offline page instead of the browser's error), an offline banner, persistent storage | no | — |
| P2.2b | Catalog copy in IndexedDB — services, deals, ranges, staff, customers, special rates — refreshed when online, stamped with a version | no | P2.2a |
| P2.2c | Outbox + sync endpoint: a client UUID per bill, replayed through the existing `createBill`, deduplicated, rejects kept in a "Needs attention" list | `bills.client_id` — done early, in P3.15 (`0018`) | ~~a separate dev Neon branch~~ nothing: the user chose to build against this database until the VPS move (2026-09-28; HANDOFF section 9) |
| P2.2d | Billing offline: `priceCart()` in the browser, `T-` number on the receipt, "pending sync" in Today's bills; the 12-hour sign-in window | no | P2.2b, P2.2c |
| P2.2e | Folders / cash entries offline (no Owner entries), Register view shows local bills | `cash_entries.client_id` (`0019`) — done | P2.2c |
| P2.2f | Day Close offline, security code on sync | no — done without one | P2.2c |

### ✅ P2.2a — PWA foundation
**Done:** 2026-09-26

A web app manifest and icons so the counter can install the app; a service worker that keeps the
app's static files and serves a plain offline page instead of the browser's error screen; a banner
on every screen when the server cannot be reached; and a request for persistent storage so the
browser does not evict what later items keep. No database change and no offline billing yet — the
banner says plainly that bills cannot be saved until the connection returns.

**What was built:**

- `src/app/manifest.ts` — served at `/manifest.webmanifest`. Icons: the existing 512px
  `src/app/icon.png` and a new `public/icon-192.png` resized from it.
- `public/sw.js` — plain JavaScript, no build step. Navigations go to the network and fall back to
  `/offline.html` only when the network fails; `/_next/static/*` is cache-first (hashed names, so
  never stale; capped at 400 files); `/offline.html` and `/logo.png` are network-first with the
  kept copy as fallback. **Pages are never cached** — they are rendered per person with that
  moment's figures. Everything else, Server Actions included, passes through. `VERSION` in the
  file throws every cache away when bumped.
- `public/offline.html` — self-contained (inline styles, no app bundle), points the counter at the
  paper bill book, and reloads by itself once a probe reaches the server again.
- `src/lib/connectivity.ts` (+ test) — `reachesServer()`: a `HEAD` to the manifest with
  `cache: "no-store"`; any HTTP response is online, a network error or 8 s timeout is offline.
- `src/components/use-connectivity.ts` — one `useSyncExternalStore` store: the `offline` event is
  trusted at once, an `online` event is confirmed by a probe, and it re-probes every 20 s online
  (Wi-Fi with dead internet fires no event) and every 3 s offline.
- `src/components/offline-banner.tsx` — sticky bar at the top of every screen, login included. It
  sets `<html data-offline>`, which gives `--offline-bar` a height in `globals.css`; the mobile top
  bar and the sidebar are offset by it so the banner never covers them.
- `src/components/pwa-setup.tsx` — registers the worker in production only (and **unregisters**
  any worker in `next dev`, so a local `pnpm start` cannot leave stale chunks behind for the dev
  server), fetches `/offline.html` once per load so the worker's copy follows deploys, and asks
  for persistent storage.
- `next.config.ts` — `/sw.js` is served `no-cache, no-store`.

**Deliberately not used:** `experimental.useOffline` (see the P2.2 note above).

**Verified** against `pnpm build && pnpm start` in the Browser pane, the server stopped and
started to stand in for the internet: the worker registered and took control; the manifest,
`/sw.js` headers and `/icon-192.png` were read back; `static-v1` filled with 18 of the page's 21
static files after one reload; with the server down, the banner appeared on `/login` from the 20 s
re-probe alone (no event), and `/billing` and `/overview` showed the offline page at their own
URLs; with the server back, the offline page reloaded by itself and the banner went away within
the 3 s re-probe. At 375px the banner is one line with no horizontal scroll. **Not seen signed
in** — no password was available — so the sidebar and mobile top bar offsets were checked in the
compiled CSS only. Persistent storage read `false`, as expected for a site that is not installed.
`pnpm build` (27 routes — the manifest is new), `pnpm test` (400, 6 new), `pnpm lint` all pass.


### ✅ P2.2b — Catalog copy in IndexedDB
**Done:** 2026-09-28 (built 2026-09-26, held in a local stash while P3.15 went first)

Everything the counter needs to price a bill without the server — services, deals, staff,
the customers who have a special rate, and the open business date — kept in the browser's
IndexedDB and refreshed whenever the server can be reached. Stamped with a version of its pricing,
which is what P2.2c will check an offline bill against. No database change, and nothing reads the
copy yet: P2.2d does.

**What was built:**

- `lib/catalog.ts` (+ test) — `CatalogService`, `CatalogDeal`, `StaffOption` moved up out of
  `features/billing/types.ts` (which re-exports them), and `offeredDeals()`: a deal is offered only
  while every one of its services is active — the rule that was inline in `getBillingData`.
- `db/queries/catalog.ts` — `getActiveCatalog()`, now what **both** the billing screen and the copy
  read, so the two cannot disagree; and `getCatalogCopy()`: that, plus the customers with special
  rates and the open business date, with `version` = sha-256 of `pricingFingerprint()`.
- `lib/offline/catalog.ts` (+ test) — the copy's shape, `pricingFingerprint()` (only what changes a
  price or a line's name, in a fixed order; a deal's service order kept, because `allocate` gives
  the leftover rupee by position) and `isCatalogCopy()`.
- `lib/offline/store.ts` — IndexedDB `art-man-offline` v1, store `catalog`, one record replaced in
  one write. `saveCatalog` / `readCatalog` / `clearCatalog`. Never delete or rename a store.
- `app/api/offline/catalog/route.ts` — a GET **Route Handler, not a Server Action**: Next runs
  Server Actions one at a time per client, so a background refresh would hold up "Save bill".
  401 signed out, 503 in maintenance (both from `checkUser()`, which `requireUser` now uses too),
  `Cache-Control: no-store`.
- `components/catalog-sync.tsx` — in the signed-in shell: fetches on load, on every return to
  online, and when the copy is 15 minutes old (checked each minute and when the tab is shown). A
  failed fetch keeps the old copy.
- Sign out clears the copy (`sign-out-button.tsx`).

**Only customers with a special rate are in the copy — a decision taken here, open to the client.** *(Changed in P2.2d, the user's choice: every customer.)*
The full list with phone numbers would sit in the browser of whoever signs in; the Customers
screen is kept from the Manager for the same reason. Offline, any other number reads as new, and
`createBill` keeps the existing customer on sync. See HANDOFF section 9.

**Verified:** from the database, read-only — the copy is 1.8 KB, its version is the same on two
reads, and its services/deals/staff equal what the billing screen reads. On the local server: no
cookie → the proxy's redirect, which the client treats as signed out; a made-up session cookie →
401 `no-store`. In the Browser pane, signed in as the manager (dev server): the copy landed in
IndexedDB on load (8 services, 2 deals, 3 staff, business day 24 Sep, version `c598c580…`); an
`offline` then `online` event refreshed it (`servedAt` moved on) with the banner shown and gone;
and 91 s later there had been no further request. `pnpm test` 434 (23 new), lint clean, build
passes with the new route.

**Not verified:** sign-out clearing the copy — Claude does not sign a person out of their own
session; the maintenance 503, which goes through the same `checkUser()` as every page.

### ✅ P2.2c — Outbox + sync endpoint
**Done:** 2026-09-28

A queue in the browser's IndexedDB for bills the server has not yet received, and an endpoint that
replays them through the existing `createBill`, oldest first, deduplicated by `bills.client_id`
(which exists since P3.15). A bill the server refuses is kept in a "Needs attention" list, never
dropped. Built against the current database, the user's call (HANDOFF section 9). **No migration.**
Nothing puts a bill in the outbox yet — P2.2d does — so the counter sees no change.

**Decisions** (the plan was shown; the user left the three choices to Claude, 2026-09-28):

- **A bill saved online still goes straight to the server**, as since P3.15. The outbox holds only
  bills that could not reach it. (The flow sketched on 2026-09-25 sent every bill through the
  outbox; P3.15 made the direct Save safe, and it gives the receipt its real number at once.)
- **A price that changed while the counter was offline** gets the bill refused, saying so, and it
  is put right on the screen. The server keeps no history of old prices — that would be a table.
- **A refused bill can be sent again, opened on the billing screen, or removed** with a reason.

**What was built:**

- `lib/offline/outbox.ts` (+ test) — the entry: the bill as `createBill` takes it, the day it was
  made on, the catalog version it was priced with, when and by whom, and a preview with names.
  `outcomeOf()`: only 200 (saved) and 422 (refused) are final; a 401 or the proxy's redirect means
  signed out; everything else is "try later". `nextToSend()`: oldest first, and a refused bill does
  not hold up the rest.
- `lib/offline/store.ts` — IndexedDB **v2**: store `outbox`, keyed by an auto-increment `seq` (so
  the order survives a clock change), unique index `clientId`. `queueBill` (queueing one id twice
  is not an error), `readOutbox`, `readOutboxEntry`, `removeFromOutbox`, `setRejected`, and
  `onOutboxChange` — every change announced to this tab and the others (BroadcastChannel). Nothing
  empties the outbox, and sign-out leaves it.
- `app/api/offline/sync/route.ts` — POST, one bill. An Origin check first (`lib/same-origin.ts`, +
  test: Next's own Server Action check, which a Route Handler does not get), `checkUser` (401/503),
  `syncBillSchema`, then `syncOfflineBill`. 200 `{ billNo, alreadySaved }`, 422 `{ reason }`, 500.
- `features/billing/service.ts` — `createBill(user, input, offline?)`: a bill made offline goes
  into the day it was made on or is refused; the id check comes first, so a bill that did arrive
  is answered with itself even after its day has closed. Refused over a price when its catalog
  version is not today's, the reason starts "Prices have changed since this bill was made
  offline." `bill.create`'s audit entry carries `offline: { madeAt, madeBy, catalogVersion }`.
  `syncOfflineBill` records every refusal as `bill.offline-refuse` (`success: false`), so the
  server knows of a bill its books do not have. `discardOfflineBill` writes `bill.offline-discard`
  with the reason and the entry — once per bill — or returns the receipt if it was saved after all.
- `components/outbox-sync.tsx` — in the signed-in shell. Sends while online: on load, on
  reconnect, on any change to the outbox (any tab), and every 30 s while bills wait. One tab at a
  time (Web Locks, `ifAvailable`); a send is given up after 30 s and simply sent again later.
- `components/use-outbox.ts`, `components/outbox-status.tsx` — the outbox for screens, and a line
  at the top of every screen: "N bills waiting to be sent" (or "Sign in again to send them"), and
  away from Billing, "N bills made offline were refused by the server and need attention".
- `features/billing/components/needs-attention.tsx` — above the billing screen: each refused bill
  with its lines, its payment and the server's reason; **Open in billing**, **Send again**,
  **Remove** (reason required, audited, guarded against a second press).
- The billing screen: `?fix=<id>` opens a refused bill (`outbox-draft.ts`, + test; a cart action
  `load`) under its own id, with the customer looked up again and a note: when it was made, why it
  was refused, what was paid and — live — what it now comes to. Saving it clears it from the outbox.
- Sign-out with bills in the outbox: a dialog says they are kept and sent after the next sign-in
  here.

**Verified, 2026-09-28** — dev server, Browser pane signed in as the manager. Nothing queues a bill
until P2.2d, so entries were written into IndexedDB by hand (HANDOFF trap 8.17):

| Test | Result |
|---|---|
| The network down (the sync's `fetch` patched to fail) | bill kept; "1 bill waiting to be sent to the server" |
| The network back | **#36** saved (`{ billNo: 36, alreadySaved: false }`), outbox empty, the line gone |
| The same bill queued again | `alreadySaved: true` — still one #36 |
| Paid Rs 50 short · the same with an older catalog version · made on 23 Sep, a closed day | three 422s: "Payment is Rs 50 short of the total", "Prices have changed since this bill was made offline. …", "This bill was made on 23 Sep 2026, but the open day is 24 Sep 2026. …" — kept, in order, in Needs attention |
| Send again | sent once more, refused again, back on the list |
| Open in billing, the Rs 50 short one | Hair wash · Arshad, the customer found, "The customer paid Rs 250 (cash). This bill now comes to Rs 300."; a Rs 50 discount with a reason → **#37** for Rs 250, the entry gone, the URL back to `/billing` |
| Remove | reason required; `bill.offline-discard` written; the entry gone |
| A 401 (patched) | kept; "Sign in again to send it." |
| Two tabs open | one POST; the second tab's lock request was refused while the first was sending |
| Sign-out with a bill waiting | the dialog; "Stay signed in" kept the session |
| 375 px | no horizontal scroll |
| Remove pressed twice; removed again after re-queueing the same bill | one `bill.offline-discard` row |
| curl: no cookie · a made-up cookie from another Origin · from this Origin | 307 to `/login` · 403 · 401 (`no-store`) |

Read back, read-only: bills #36 and #37 only (37 in all), with their `client_id`s; the audit rows
above.

**Found and fixed while verifying:** in a pane that was not drawing, `pending` never disabled the
Remove button, a second press went through, and one bill was discarded twice. The server now writes
one discard per bill, and the button is guarded by a ref.

`pnpm test` 479 (45 new), lint clean, build passes (29 routes — the sync is new).

**Not verified:** a real offline session end to end (nothing queues a bill until P2.2d); a browser
without Web Locks or BroadcastChannel; the maintenance 503 (the same `checkUser` as the catalog).

**Test data left in the database** (the user's call, HANDOFF section 9): bills #36 and #37 on 24 Sep
(Test customer P3.15 C); `bill.offline-refuse` rows for four test bills; `bill.offline-discard` rows
for three (one of them twice, before the fix).

### ✅ P2.2d — Billing offline
**Done:** 2026-09-29

The counter rings up bills with no internet: priced in the browser from the offline copy (P2.2b),
kept in the outbox (P2.2c), a receipt with a temporary `T-` number, "pending" bills shown with
the day's bills, and offline use allowed for 12 hours after the server last confirmed the
sign-in. The first item that puts a bill in the outbox. **No migration.**

**Decisions** (the plan was shown; the user took every recommendation, and chose one thing
against the old default):

- The `T-` number is stored in **`bills.book_no`** — the paper book's column, and the same idea: the
  number on the slip a customer got while the system could not give one. Shown as "Offline T-5"
  (a paper number stays "Book B-2/45"). A bill with a paper book number gets no `T-` number.
- `T-` numbers **restart at T-1 each business day** (the slip carries the date).
- A Save whose answer is lost gets **"Keep it for later and carry on"**, which sends it to the
  outbox under the same id.
- **The offline copy holds every customer** — the user's choice (HANDOFF 9, question 4).

**What was built:**

- **The copy** (`db/queries/catalog.ts`, `lib/offline/catalog.ts`): `customers` — every customer
  with their special rates, replacing `customersWithRates` — and `user`, who it was made for.
  `getCatalogVersion()` for the "prices changed" check. `customerByPhone()`.
- `lib/offline/session.ts` (+ test) — the 12 hours from the copy's `savedAt`, and the refusal
  text; a clock set back more than 5 minutes ends the window. `lib/offline/slip.ts` (+ test) —
  `T-` numbers and `slipLabel()`.
- `lib/offline/store.ts` — IndexedDB **v3**: store `counters` (`nextTempNo`, one transaction, never
  cleared); `saveCatalog` stamps `savedAt`; `onCatalogSaved`.
- **The billing screen:** offline (`!online`, or the offline page) a Save goes to `keep()` — the
  12-hour check, the `T-` number, `offlineBill()` (`features/billing/offline-bill.ts`, + test: the
  entry and the slip from the same priced lines), `queueBill`, the slip, the next customer. A
  thrown Save with `navigator.onLine` false goes straight there; otherwise the P3.15 box offers
  "Keep it for later and carry on". Corrections and refused bills say they need the internet.
  Badge "Offline"; button "Save offline Rs …".
- **The customer box** looks a number up in the copy offline — and a failed server lookup falls
  back to it: before, "Find" with no internet took the whole screen down.
- **The slip:** "Bill T-1 kept offline", `Bill T-1 (temporary number)`, a line saying the number
  comes later; a reprint of a synced bill prints "Offline T-1" under its number (`Receipt.bookNo`).
  The logo on the slip is `/logo.png` itself (`SalonLogo unoptimized`), which the worker keeps.
- **Pending bills** (`pending-bills.tsx`) above Today's bills and on the offline page.
- **Today's bills:** Edit and Cancel off with no internet; a Cancel that cannot reach the server
  says so instead of taking the screen down. "Offline T-5" in Today's bills and the Daily report.
- **`/offline-billing`** — a static page (`app/offline-billing`, `offline-billing.tsx`): the copy,
  the 12-hour check, Needs attention, the billing screen with `offlineOnly`, pending bills, and its
  own `OutboxSync` + `CatalogSync`; online, a bar sends the counter back to the full screen.
- **`public/sw.js`:** keeps `/offline-billing` and every file its HTML names (`shell-v1`, stored
  last); with no network, `/` and `/billing` redirect to it; `offline.html` offers it when kept.
  Asked for on every page load, on `controllerchange` and after every copy saved
  (`keepOfflineBilling()`); signed out, the proxy refuses the worker and nothing is kept.
- **The banner** says "bills are kept on this computer" only when offline billing can run; the
  loading and error screens offer offline billing when there is no internet (`OfflineWayOut`).

**Verified, 2026-09-29** — `pnpm build` + `pnpm start` in the Browser pane, the user signed in as
the manager, "offline" = the server stopped:

| Test | Result |
|---|---|
| Signed out | the worker refused `/offline-billing` by the proxy; nothing kept |
| Signed in, online | IndexedDB v3; the copy: 6 customers, `user` Manager; the page and its 20 files kept, from this build |
| Server stopped, `/billing` open | "No internet — bills are kept on this computer…", badge "Offline" |
| Find `00000315003` offline | "Test customer P3.15 C — Found on this computer — no internet" |
| Save offline | **T-1**: "Bill T-1 kept offline", the slip with the logo, "Waiting to be sent: T-1 · Pending" |
| `/billing` reopened offline | the worker redirected to `/offline-billing`: "Billing — offline", "On Manager's sign-in, until 15:51", T-1 pending |
| A walk-in there | **T-2**, Rs 500 |
| `/daily-report` offline | `offline.html` with "Open offline billing" |
| `savedAt` moved back 13 hours | "Offline billing has ended: the server last confirmed this sign-in on 28 Sep 2026, 14:53…", banner back to the paper book |
| Server started | the outbox sent both: **#38** (`book_no` T-1, the customer) and **#39** (T-2); audit `bill.create` with the offline details; the 12 hours renewed |
| The full screen | Today's bills and the Daily report: "#38 · Offline T-1", "#39 · Offline T-2" |
| A Save with no answer, online (actions blocked) | the P3.15 box with "Keep it for later and carry on" → **T-3**, sent at once → **#40** |
| Reprint #38 | "Bill #38 / Offline T-1" |
| 375 px, the offline page | no horizontal scroll |
| A navigation that never answers, offline | the loading screen with "Open offline billing" |

`pnpm test` 499 (20 new), lint clean, build passes (30 routes — `/offline-billing` static).

**Found and fixed while verifying:** signing in reaches Billing without a page load, so the
offline page was never kept (now `CatalogSync` asks too); the first ask after a changed worker
reaches the old one (now asked again on `controllerchange`); a page cut off mid-load when the
connection goes sat on "Loading" (now `OfflineWayOut`). HANDOFF trap 8.18.

**Not verified:** a real internet outage (the server was stopped instead, which is what the
browser sees); printing on paper; two browsers on one counter (each has its own IndexedDB, so each
counts its own `T-` numbers).

**Test data left in the database:** bills #38, #39, #40 on 24 Sep (T-1, T-2, T-3).

### ✅ P2.2e — Folders / cash entries offline
**Done:** 2026-09-29 · migration `0019` (`cash_entries.client_id`, applied to the live database
before the code was pushed, and read back)

The counter records expenses and staff advances with no internet: kept in the outbox beside the
bills, in the order they were made, and saved through the same `addEntry` when the connection
returns — once, however often they are sent. Daily folders and the Register work offline on pages
of their own, drawn from a new copy of the open day in the browser plus what is still in the
outbox; online, both screens show what is still on this computer too, marked "Not sent yet".

**Decisions** — the user left them to Claude ("jo tumhe sahi lagy karo mujhe app ready kr k do",
2026-09-29), so the recommended option was taken each time:

- **One outbox, one line.** A folder entry waits in the same IndexedDB store as the bills and is
  sent in the order it was made. P2.2f's offline close can then queue behind the day's bills and
  entries instead of racing them.
- **`cash_entries.client_id`, the proper fix** (as P3.15 did for bills). A unique id per entry is
  what makes a re-send harmless. The online Folders form sends one too, so a Save whose answer is
  lost can never add the same expense twice.
- **Offline: an expense or a staff advance, nothing else.** The Owner's own cash needs the Owner's
  PIN, which only the server checks (the client's answer, 2026-09-26); offline those two choices
  are disabled and say why. Cancelling an entry needs the internet. An entry still on this
  computer has no Cancel: once sent it is an ordinary entry and is cancelled like one — the
  mistake stays on the record (spec §11).
- **A copy of the open day in the browser** — its bills, folder entries and staff — fetched from
  `/api/offline/day` after every save, every 5 minutes and on every return to online. Without it
  an offline screen could only show what was made offline, and the register would tell the
  counter that Arshad had done Rs 800 when he had done Rs 5,000. P2.2f needs the same data for an
  offline close.
- **Separate static pages**, `/offline-folders` and `/offline-register`, beside `/offline-billing`,
  in one frame with tabs between them (`components/offline-page.tsx`). Each page belongs to one
  feature, as `ARCHITECTURE.md` wants; the service worker keeps all three and opens each for its
  own screen.
- **What the screens count.** Daily folders' four totals include what is still on this computer,
  and a line under them says so. The register draws pending bills in their columns, after the
  server's, dashed and "Not sent yet", and the note under the grid says the Daily report's Total
  sales above does not include them yet. The Daily report's bill list and summary cards stay the
  server's figures.
- **A refused entry: Send again, or Remove with a reason** (audited once). No "open it here" as a
  refused bill has: an entry is one line, and entering it again is quicker than putting it right.
- **A Save whose answer is lost** (online): an expense or advance goes straight to the outbox under
  the same id — no "ask the server" loop as a bill has, because an entry has no receipt to wait
  for. The Owner's cash cannot be kept, so the form stays as it was, under the same id: pressing
  Save again can never make a second one.

**What was built:**

- **Migration `0019`** — `cash_entries.client_id uuid unique`. `addEntry(user, input, offline?)`
  answers an id it has already saved with `{ alreadySaved: true }` before anything else (so an
  entry that did arrive is answered even after its day closed), refuses an offline entry whose day
  is not the open day, audits `offline: { madeAt, madeBy }`, and settles two simultaneous sends
  with the unique index. `syncOfflineEntry` records every refusal as `folder.offline-refuse`;
  `discardOfflineEntry` writes `folder.offline-discard` once per entry, or finds it was saved.
- **`app/api/offline/folders/route.ts`** — POST, the bill route's twin: Origin check, `checkUser`,
  `syncEntrySchema` (only an expense or an advance), 200 `{ alreadySaved }`, 422 `{ reason }`.
- **`app/api/offline/day/route.ts`** + `db/queries/day-copy.ts` — the open day's bills
  (`getDayBills`, now with `clientId`), entries (`db/queries/day-entries.ts`, moved out of
  `folders/queries.ts`) and every staff member (`getAllStaff`). `no-store`.
- **`lib/offline/outbox.ts`** — `OutboxFolderEntry` (`type: "folder"`; a bill has no `type`),
  `OutboxItem`, `syncOf` (URL, body and how to read the answer, per kind), `outcomeOf(…, kind)`,
  `outboxTally`, `describeCounts` ("2 bills and 1 folder entry"), `waitingBills` /
  `waitingFolderEntries` (a day's waiting ones, minus what the server already lists — so a send
  whose answer was lost is never counted twice). `lib/offline/day.ts` — the day copy's shape,
  `isDayCopy`, `dayFor` (another day's copy is never shown as today's), `knownIds`.
  `lib/offline/pages.ts` — the offline pages and what each stands in for; its test reads
  `public/sw.js` and fails if the worker's list drifts from it.
- **`lib/offline/store.ts`** — `readOutbox()` returns every item; `queueEntry`; the day copy under
  key `day` in the existing `catalog` store (no new IndexedDB version); sign-out clears it with the
  catalog.
- **`components/`** — `DaySync` + `requestDayRefresh()` (called after every Save, cancellation and
  outbox send); `OutboxSync` sends each kind to its route and refreshes the screen after a pass
  that saved anything; `OutboxStatus` and the sign-out dialog count bills and entries apart;
  `OfflinePage` is the frame of all three offline pages; `OfflineWayOut` offers the offline page of
  the screen that could not load.
- **Daily folders** — `FoldersScreen` (client) draws the server's rows plus the outbox's and works
  the totals out with the same `folderTotals`; `EntryForm` keeps offline entries and lost answers;
  `EntriesTable` marks "Not sent yet" and turns Cancel off offline; `EntryAttention` is the
  entries' Needs attention. `rows.ts` (pure, tested) turns the outbox into rows and checks an entry
  before it is kept, as `entrySchema` would.
- **Register** — `buildSheet(bills, staff, pending)`, `columnsFor`, `pendingBillsOf` (pure,
  tested); `RegisterView` (client) for the Daily report and the offline register;
  `getRegister` replaces `getSheet`.
- **`public/sw.js`** — keeps `/offline-billing`, `/offline-folders` and `/offline-register`; with no
  network `/` and `/billing` open offline billing, `/folders` offline folders, `/daily-report` and
  `/worksheet` the offline register. It answers both `cache-offline-pages` and the old
  `cache-offline-billing`. `offline.html` offers every offline page it finds kept.

**Verified, 2026-09-29** — `pnpm build` + `pnpm start` in the Browser pane, signed in as the
manager, "offline" = the server stopped:

| Test | Result |
|---|---|
| Online, before anything | the worker kept all three offline pages, each identical to this build's and with all its files; the day copy in IndexedDB (24 Sep: 28 bills, 2 entries, 3 staff) |
| A Save whose answer is lost (the action's `fetch` patched to throw after the real call) | "The connection dropped…": kept under the same id; the outbox's send answered `{"alreadySaved":true}`; **one** row and one `folder.expense` audit row |
| Server stopped, `/folders` open | banner "No internet — bills and entries are kept on this computer…"; "New entry · Offline"; Owner's cash "(needs the internet)", disabled; Cancel disabled |
| An expense saved offline | "Not sent yet" row; drawer expenses Rs 10 → 20; a waiting bill paid Rs 50 online counted in Online payments; "1 bill and 2 folder entries waiting to be sent" |
| `/folders` reloaded offline | the worker redirected to `/offline-folders`: "Daily folders — offline", the day as of 05:49, the same totals |
| The Register tab | `/offline-register`: the waiting bill `T-9` in Arshad's column after #42, dashed, "Not sent yet" |
| Server started | the expense saved (`client_id`, audit `offline: { madeAt, madeBy }`); a made-up short bill and a closed-day entry refused, both in the audit log |
| The full Folders screen | the saved expense as a server row; Needs attention: "This entry was made on 23 Sep 2026, but the open day is 24 Sep 2026…" |
| Send again · Remove | refused again, back on the list · removed, `folder.offline-discard` written, the outbox empty of it |
| Online register, the bill route unreachable | `T-9` in the Daily report's register, and "…Total sales above does not until they reach the server" |
| Removing the refused bill on Billing | `bill.offline-discard`; the outbox empty |
| Offline, `/staff-khata` · `/daily-report?date=…` | `offline.html` with Billing, Folders and Register · the offline register |
| 375 px | the three offline pages, `/folders` and the register: no horizontal scroll |

`pnpm test` 562 (63 new), lint clean, build passes (34 routes — `/offline-folders` and
`/offline-register` static, `/api/offline/day` and `/api/offline/folders` new).

**Found and fixed while verifying:** an entry sent by the outbox vanished from an open Daily folders
screen until the next page load — the outbox let go of it before the server's rows had it; the
outbox now refreshes the screen after a pass that saved anything. The register's note counted a
waiting bill by what was paid rather than by its lines, which is what the columns add up. An
online Save whose answer was lost could keep an entry the server would refuse; the form now checks
it first (`offlineEntryProblem`), offline or not.

**Not verified:** a real internet outage (the server was stopped instead); a staff advance sent
through the outbox (the path is the expense's, with the khata line `addEntry` always wrote);
signing out with entries waiting — Claude does not sign a person out of their session; two
browsers on one counter.

**Left for P2.2f, found on the way:** *(all three done in P2.2f, 2026-09-29)*

- **The online Day Close does not look at the outbox.** Closing the day while this computer still
  holds that day's bills or entries — waiting to be sent, or refused and not yet dealt with —
  leaves them to be refused afterwards ("made on 24 Sep, but the open day is 25 Sep"). P2.2d
  already allowed this for bills. The close screen should hold back until the outbox has nothing
  of that day, and say why.
- **The day's copy is ready for an offline close**: bills, entries and staff. An offline close will
  also need the opening cash, each staff member's pay and the khata balances in it.
- **Changing the business day refreshes neither copy at once.** After a close and a new day, the
  catalog copy says the old date for up to 15 minutes and the day copy for up to 5; work made
  offline in that gap is refused as the old day's. Asking both to refresh after a close or a new
  day (`requestDayRefresh()`, and the same for the catalog) closes the gap.

**Test data left in the database:** on 24 Sep, two Rs 10 expenses — "P2.2e test (answer lost)"
and "P2.2e test (offline)" — each cancelled ("P2.2e verification entry, not a real expense"), so
the day's figures are unchanged (their net is 0, read back); audit rows `folder.expense` ×2,
`folder.cancel` ×2, `bill.offline-refuse` ×2 and `bill.offline-discard` ×1 for a made-up bill that
was never saved (still 42 bills), `folder.offline-refuse` ×2 and `folder.offline-discard` ×1 for a
made-up closed-day entry.

**Seen in the data, not caused here:** bills #41 and #42 (24 Sep, made 29 Sep 04:41 and 04:43) carry
`T-1` and `T-2` — the same slip numbers as #38 and #39. They came from another browser, whose
IndexedDB counts its own `T-` numbers: the limit P2.2d wrote down under "two browsers on one
counter". The slips still differ by their bill number once synced.

### ✅ P2.2f — Day Close offline
**Done:** 2026-09-29 · no migration

The manager closes the day with no internet: the same five steps, worked out in the browser from
the copy of the day (P2.2e) plus what is still in the outbox, and the close kept in the outbox behind
the day's bills and entries. The server closes the day when the close reaches it — making the
security code then, as the client asked (2026-09-26) — and only if its own books come to the same
expected cash the count was compared with. With it, what P2.2e left: the online close holds back
while this computer still has any of the day, and both offline copies are fetched again the moment
the business day changes. **P2.2 is complete.**

**Decisions** — the user said to start ("haan P2.2f shuru karo", 2026-09-29) and, as for P2.2c–e,
left the technical choices to Claude; the recommended option was taken each time:

- **The close waits behind its day's work** (`heldBack` in `lib/offline/outbox.ts`). A day's close
  is not sent while anything else of that day is in the outbox — waiting, or refused and waiting for
  a person — because once the server has closed a day it takes none of it (an offline bill or entry
  goes only into the day it was made on). A refused bill of the day keeps the close waiting until it
  is put right or removed on Billing.
- **The server closes the day only if its expected cash matches.** The count is a fact of that
  moment; if the day's books moved since (a refused bill removed, something done from another
  device, a copy of the day older than the last save), the difference and its reason would describe
  a different day. So the close is refused, saying both figures, and the day is closed again on the
  full screen — the steps start from what was entered offline, under the same id. Earnings, the
  snapshot and the security code are always the server's own.
- **Everything of the day still on this computer is counted in the offline close — waiting or
  refused.** A refused bill's money was taken and is in the drawer; it is meant to be put right and
  saved (then the close matches), and if it is removed instead, the close is refused and redone with
  an honest difference. The offline screen says which ones are refused.
- **One close per id, recorded in the `day.close` audit entry** (`after.clientId`), which is
  append-only — no migration. A close whose answer was lost, sent again, is answered with the close
  it made (`alreadySaved`), even after a reopen. The online screen sends an id too, and a close whose
  answer is lost goes to the outbox under it, as a folder entry does (P2.2e).
- **Closed here means closed here.** Once the outbox holds a close for the day — waiting or refused
  — Billing and Daily folders take nothing more for it, online or offline (`closeOf`; a refused bill
  of that day can still be put right). The pill on the offline pages says Closed.
- **No undo on the device, and no next day offline.** A close made here cannot be taken back here;
  once it reaches the server the Owner can reopen the day, as always. The next business day is
  started on the full screen, with the internet: until then the paper bill book. (The 12-hour
  sign-in window means the morning after an evening outage is mostly past it anyway, and one open
  day per device keeps the outbox's order simple.)
- **A refused close: close again, or Remove with a reason** (audited once, as for bills and entries).
  For a day the server has open, the steps below start from the refused close; for a day already
  closed on the server, only Remove.

**What was built:**

- `lib/offline/outbox.ts` — `OutboxCloseEntry` (`type: "close"`: attendance, payouts, counted,
  reason, the expected cash shown, and a preview of the breakdown and payouts); `isCloseItem`,
  `isOutboxCloseEntry`, `closeSyncRequestOf`, `CLOSE_SYNC_URL`; `outcomeOf(…, "close")` wants a
  security code; `heldBack` / `nextToSend`; `KindCounts.closes`, `NO_COUNTS`, `countOf`,
  `describeCounts` ("1 bill, 1 folder entry and 1 day close"); `closeOf`, `workOfDay`. A pre-P2.2f
  build does not read a close and never sends one.
- `lib/offline/day.ts` + `db/queries/day-copy.ts` — the day copy's `close`: opening cash, everyone's
  pay (`getAllStaff` now reads it; the register maps it away) and the khata balances
  (`loadKhataBalances`, the close's own query). `closeCopyOf` refuses a copy kept before P2.2f.
- `lib/offline/store.ts` — `queueClose`: a refused close closed again takes its own place in line
  instead of joining it. `lib/offline/session.ts` — `trustRefusal(…, "close")`: count the drawer,
  write the count down.
- `features/day-close/offline-close.ts` (+ test) — `localDayOf` (the server's day plus this
  computer's, the server's staff rule, khata less advances still here), `reviewLocally`
  (`summarizeDay` + `expectedCashBreakdown`, as `reviewClose`), `closeProblem`, `closeEntryOf`.
- `features/day-close/service.ts` — `closeDay(user, input, offline?)`: the id first
  (`closedEarlier`, which also settles two sends at once), the open-day check, the expected-cash
  check inside the transaction, `after.clientId` and `after.offline`. `syncOfflineClose`,
  `recordOfflineCloseRefusal` (`day.offline-close-refuse`), `discardOfflineClose`
  (`day.offline-close-discard`, once). `discardOfflineCloseAction`.
- `app/api/offline/close/route.ts` — POST, the bill and folder routes' twin: Origin, `checkUser`,
  `syncCloseSchema`, 200 `{ securityCode, alreadySaved }`, 422 `{ reason }`.
- **The screens:** `CloseWizard` works both ways (`local` on the offline page; on the full screen a
  review that cannot reach the server is worked out here from the copies); `ReviewStep` says when it
  was worked out on this computer and offers "Close day offline"; `DayCloseScreen` (the online gate:
  the close kept here / hold back / the steps, from a refused close when there is one);
  `ClosedHere`; `CloseAttention`; `/offline-day-close` (`OfflineDayClose`, a fourth tab in
  `OfflinePage`); `components/closed-here-note.tsx` on Billing and Daily folders.
- **Copies refreshed at once** — `requestCatalogRefresh()` beside `requestDayRefresh()`, after a
  close (online, or sent by the outbox), Start next business day, a reopen and the first day.
- `public/sw.js` keeps `/offline-day-close` and opens it for `/day-close`; `offline.html` offers it;
  the outbox line and the sign-out dialog count closes; `useOutboxReady()`.

**Verified, 2026-09-29 — against a copy of the live database, not the live one.** `pnpm db:backup`,
restored into a throwaway PostgreSQL 18.4 cluster made with `initdb` in the session's scratchpad
(port 5544), and `pnpm build` + `next start` pointed at it (HANDOFF trap 8.20). Which database the
server used was proved twice: its connections in that cluster's `pg_stat_activity`, and a marker
customer that exists only there appearing in the catalog copy. **Nothing was written to live.**
Browser pane, signed in as the manager, "offline" = the server stopped:

| Test | Result |
|---|---|
| The same inputs online and offline (24 Sep, Sherry paid 1,178, counted 20,000) | the server's review and the offline one: Expected **Rs 26,272**, every breakdown line the same; staff work, khata and earnings the same on every step |
| `/day-close` with the server stopped | the worker opened `/offline-day-close`; four tabs |
| An offline bill (T-4, Rs 300) and expense (Rs 100), then the offline close | Hamid's work 10,321 → 10,621; Expected **Rs 26,472**; short Rs 72 refused without a reason, then kept: "Waiting to be sent, after the day's 1 bill and 1 folder entry" |
| Billing and Daily folders offline after it | "24 Sep 2026 was closed on this computer…", Save disabled on both |
| Server started | sent in order: bill **#43**, the expense, then `day.close` with the close's id and `offline`; snapshot expected 26,472, counted 26,400, −72 with the reason; code **0AB1-DCC9-B5F6**, which `verifyDayCode` recomputes from the rows (and 23 Sep's before it) |
| Start next business day | both copies on 25 Sep within 3 s (opening cash 26,400) |
| 25 Sep closed offline, then a Rs 100 expense added on the server only | refused: "…compared with an expected Rs 25,600, and the server's books now expect Rs 25,500…"; day still open; `day.offline-close-refuse`; Billing: the note with "The server refused that close", Save disabled |
| Close again on the full screen | the steps pre-filled (Sherry 800, 25,600); server review: extra Rs 100; closed under the same id (`day.close` without `offline`), code **50E9-A756-AE64**; off the outbox |
| An online close whose answer was lost (fetch patched: sent, then thrown) | kept under the same id; the outbox's send answered `{"securityCode":"B1AE-4E4A-B2CF","alreadySaved":true}`; one `day.close`, one snapshot, one payment |
| A refused bill of the day in the outbox | no steps: "Some of the day is still on this computer … refused by the server. Put it right or remove it on Billing"; with its route cut and the bill back in line: "being sent … moves on by itself"; offline: the link to Day close offline; removed on Billing → the steps |
| A made-up close for 24 Sep, already closed | refused ("24 Sep 2026 has already been closed on the server…"); Needs attention with Remove only; reason required; `day.offline-close-discard` |
| The internet gone between step 3 and the count, on the full screen | expected worked out on this computer (Rs 24,000), "Close day offline", kept, sent when the server came back (27 Sep, code **29EA-584D-F77B**) |
| `/offline-day-close` with no open day | "No business day is open … started on the full Day close screen" |
| 375 px, the offline close | no horizontal scroll |

`verifyDayCode` recomputed all four test days' codes from the rows (24–27 Sep). `pnpm test` 600 (38
new), lint clean, build passes (36 routes — `/offline-day-close` static, `/api/offline/close` new).

**Found and fixed while verifying:** the offline pages' day pill still said Open on a day closed
there; it says Closed now. A lint failure (`react-hooks/purity` on a `Date.now()` in an event
handler) appeared when a helper's text was rendered inline; rendering it through a component cleared
it (HANDOFF trap 8.21).

**Not verified:** a real internet outage; the Owner's reopen and the first day refreshing the copies
(the same `dayChanged` as Start next business day, which was seen); sign-out with a close waiting
(Claude does not sign a person out); two browsers on one counter.

**Test data left in the live database:** none — every write went to the throwaway copy, which was
deleted afterwards.

---

## P3 — Remaining spec features

| | Item | Size |
|---|---|---|
| ✅ P3.1 | **Give a bonus** — done 2026-09-23. See below | small |
| ✅ P3.2 | **Customers screen** — details and special rates. Done 2026-09-23. See below | medium |
| ✅ P3.3 | **Staff monthly salary slip** (spec §6.4) — done 2026-09-29: a PDF downloaded from Staff khata, nothing sent. See below | medium |
| ✅ P3.4 | **Next-month adjustment for a closed month** (spec §7.4) — done 2026-09-29 (migration `0020`). See below | medium |
| ✖ P3.5 | **Real alert to the Owner on 3+ cancellations** — removed 2026-09-29: the client does not want it. The note on screen stays | — |
| ✅ P3.6 | **Receipt printing / thermal printer** — done 2026-09-22. See below | small |
| ✅ P3.7 | **Backup and restore** — done 2026-09-29: the backup since 2026-09-23, restored twice into a local copy, which the user accepted; no restore into Neon. A schedule moved to P5.3. See below | medium |
| ✅ P3.8 | **Customer's last visit on the billing screen** (spec §5.1) — done 2026-09-22. See below | small |
| ✅ P3.9 | **Audit failed logins** — done 2026-09-23. See below | small |

### ✅ P3.3 — Staff monthly salary slip
**Done:** 2026-09-29 · no migration · new dependency `pdf-lib` (server only)

**Redefined by the client, 2026-09-29, through the user:** at month end, one slip per karigar with
the month's whole account — commission and the rest, totals and what is left to pay — as **a file
to download, and nothing else**: no WhatsApp, no SMS, nothing sent. It is the karigar's proof. With
the same answer the client removed P3.5 and every plan to send anything on WhatsApp or SMS, so the
Day close "Preview WhatsApp summary" went too.

**What the Owner or the Manager does:** Staff khata → the person → **Salary slip** → the month
(the last closed one is chosen to start with, marked *final*; the open one is *provisional*) →
**Download PDF**. The file is `salary-slip-<name>-<month>.pdf`.

**What is on the slip** (A4, one page for a month with a day off a week):

- The salon, the month, and **FINAL** (the month is closed; "these figures will not change") or
  **PROVISIONAL** ("may change at month end; a day's commission and wage are added when that day is
  closed").
- The person and how they are paid ("Daily wage + commission (10%)").
- The totals, top to bottom so each line follows from the ones above: **brought forward** from the
  month before; **earned** — commission (with the work it was worked out on), daily wage (with the
  number of days), monthly salary (on a provisional slip: "added when the month is closed"), bonus;
  **taken** — payments and advances; **adjustments and corrections** when there are any; and
  **"Payable to <name>"**, or **"Advance to recover from <name>"** when more was taken than earned.
- **Room to sign** — the karigar's and the Owner's or Manager's — right under the total.
- **The month day by day:** commission, wage, other (salary, bonus, adjustments), taken, and the
  balance at the end of each day. A long month carries over onto a second page with the headings
  repeated; every page says when it was made and "Page n of N". The generator's name is **not**
  printed: a slip made by the developer must not name the role (HANDOFF section 6).

**Choices made while building it** (the client left the details open):

| | Chosen |
|---|---|
| Which months | Every month with a business day, the open one included — spec §6.4 asks for provisional slips mid-month. Final once the month is closed |
| Who | Any signed-in role. The Manager keeps the khata and hands the slip over, and the slip shows nothing the Staff khata screen does not |
| The format | A PDF, made on the server with `pdf-lib` and the standard Helvetica — nothing embedded, 3–6 KB a slip. It writes a Western character set only; `pdfSafe` turns anything else (a name typed in Urdu script) into `?` rather than make no slip at all |
| Where the figures come from | The khata alone, added up: nothing stored, so a slip can never disagree with the ledger. The work figure is the person's bill lines on the month's **closed** days — cancellations net out, discounts are already in the line amounts |
| Corrections | A line that reverses another (a reopened day, a correction, a cancelled P3.4 adjustment) counts where that one did, so commission, wage and payments are each net of their corrections; an advance's cancellation nets against the advances |
| An error | The screen fetches the file and then saves it, so "sign in again" or "no connection" is said in the dialog rather than saved as a broken file |

**What was built:**

- `features/staff-khata/slip.ts` — pure: `categoryOf`, `buildSlip`, `slipFileName`. 15 tests.
- `features/staff-khata/slip-pdf.ts` — pure: `summaryRows`, `statusNote`, `pdfSafe`, and
  `renderSlipPdf` (the layout, and pagination through a small `Sheet` writer). 11 tests, including
  a PDF read back with `PDFDocument.load` and a 31-day month going onto a second page.
- `features/staff-khata/queries.ts` — `getSlipData`: the person, every khata line of theirs, the
  month's close, the work on its closed days.
- `app/api/staff-slip/route.ts` — `GET ?staff=&month=`: the session checked (`checkUser`), the query
  checked (`slipQuerySchema`), then the PDF, `no-store` and `attachment`. 401, 400, 404 and 503 come
  back as plain words.
- `features/staff-khata/components/salary-slip.tsx` — the button and the dialog; the Staff khata
  page passes the months (`getMonthChoices`).
- `lib/business-date.ts` — `previousMonth`.
- **Removed:** the Day close "Preview WhatsApp summary" button and its text (`summary-text.ts`
  and its test), `SnapshotRow.cancelledBills` and the query that counted them for it. The closed
  day now says "The day's security code. If any of this day's entries is changed later, it will
  no longer match." instead of "Security code sent with the daily summary", which nothing ever sent.

**Verified, 2026-09-29, against a restored copy of the live database — nothing written to live**
(HANDOFF trap 8.20; a throwaway Owner that existed only in the copy). The copy's days were closed
to 30 Sep, September closed and 1 Oct started, by script:

| Check | Result |
|---|---|
| The fresh backup, restored | 31 tables, 21 migrations, **15 triggers**, 43 bills — migration `0020` restores with the rest |
| Sherry's September slip, rendered from the copy and read back | final; commission 564 on work of Rs 5,637; daily wage 7,200 (9 days); payments -1,770; **payable Rs 5,994** — equal to the sum of her khata lines to 30 Sep. Her 22 and 23 Sep reopen and correction lines landed in the right columns |
| Arshad's September slip | commission 1,135 on Rs 11,350; salary 40,000; bonus 500; advances -2,000; **payable Rs 39,635** — equal to his khata |
| October (open) | provisional, amber, brought forward 5,994, "Nothing in the khata this month" |
| The screen | Staff khata → Salary slip → September (final) chosen to start with → Download PDF: `/api/staff-slip` 200, a 3,629-byte `application/pdf`, saved as `salary-slip-sherry-2026-09.pdf` (the save was caught in the page, not written to disk), dialog closed |
| The refusals | a month with no business day → 404 in words; a staff id that is not one → 400 "Choose a staff member"; an unknown one → 404; no session cookie → the proxy's redirect, which the screen reads as "sign in again"; the request failing → "No connection…" in the dialog, which stays open |
| 375 px | the ledger header's badge and buttons wrap; nothing scrolls sideways |
| Day close, a closed day | no WhatsApp anywhere; "Reopen this day" and "Start next business day" only |

No server errors. The copy, its dump, the throwaway account, the rendered PDFs and the scripts were
deleted afterwards; the pane signed out, its copies cleared, the outbox empty.

`pnpm test` **662** (27 new, 3 gone with the summary), `pnpm lint` clean, `pnpm build` passes (37 routes).

**Not verified:** the file opened on a phone, and printed on paper. A real Manager session (the
route and the button do not look at the role).

**Size:** medium · **Value:** medium (the karigar's proof; asked for by the client)

### ✅ P3.4 — Next-month adjustment for a closed month
**Done:** 2026-09-29 · migration `0020`

Spec §7.4 and §11: once a month is closed nothing in it can be cancelled, and a mistake found later
becomes an **adjustment entry in the next month**. Until now the app only refused ("Correct it with
an entry in the next month") and offered no such entry, so a wrong bill, expense or staff line in a
closed month could not be put right anywhere.

**The user said "P3.4 shuru karo" (2026-09-29) and left the choices to Claude.** The recommended
ones were taken:

| Question | Chosen |
|---|---|
| Where does it count? | In **the month of the latest business day**, which must be open — never in the closed month. The closed month's report and the partners' shares were frozen at close and may have been paid out, so they are not touched. Between a month's close and the next month's first day there is no open month, and the screen says to start the next day first |
| What can be put right? | Four things, in the Owner's words: **a sale** (a bill charged or entered wrong: cash or online), **an expense** (daily or monthly, entered wrong or left out: paid by the business or by the Owner), **what a staff member earned** (commission, wage, salary, bonus: the profit *and* their khata), **what a staff member took** (an advance or a payment recorded wrong: the khata only — money taken is not a cost, spec §7.1) |
| How is the amount given? | "**More** than recorded" or "**Less** than recorded", plus the rupees, stored signed. Neither is chosen to start with: it is the one answer that turns the whole entry round. The dialog shows what it will do before saving: "October 2026's profit: -Rs 1,000", "Arshad khata: -Rs 100" |
| Who, and from where? | **The Owner** (and the developer, as everywhere), from the **closed month's Monthly report** — a "Record an adjustment" button in its "closed and frozen" banner. The Daily report of a closed month's day says so and links there, instead of offering a Cancel the server would refuse |
| Does cash move? | **No.** It puts the books right. Money that changes hands now — a refund, a payment to a staff member — goes through Daily folders as usual |
| The khata | A staff adjustment writes an `adjustment` line into that person's khata, **dated with the latest business day**, as a bonus is (P3.1), labelled "Adjustment for September 2026: <reason>". Khata lines are in no day's security code, so dating one on a closed day breaks nothing |
| A mistake in an adjustment | **Cancel** it while the month it counts in is open: a row of the opposite sign pointing back at it (`voids_id`, **unique**, so two cancels at once cannot both save), and a khata line reversing its khata line (`reverses_entry_id`). Once that month is closed the adjustment is frozen with it; another adjustment puts it right |
| The Owner account | A corrected **online** sale changes what reached the Owner's bank, and a corrected cost **the Owner paid himself** changes what is credited back to him. Both are carried as their own line, "Adjustments for earlier months: online money, costs the Owner paid", so "Balance with business" does not move for money that never passed through the business |

**Found while building it, and fixed here because P3.4 depends on it: a month could be closed
before it was over.** `closeBlockers` only asked that every day *so far* be closed. Business days
follow one another a calendar day at a time (`startNextDay` is `nextDate`), so closing September on
24 Sep would have opened 25 Sep **inside the frozen month** — its bills counted in no month's report,
and no month open to count an adjustment in. Month close is now refused until the month's last
calendar day has been closed ("September 2026 is not over yet: it can be closed once 30 Sep is
closed"). No month has been closed on the live database, so nothing already saved is affected.

**What was built:**

- **Migration `0020`** — enum `month_adjustment_kind` and table `month_adjustments`: the month it
  counts in, the closed month it corrects, the kind, the signed amount, `online` (a sale),
  `paid_from` (an expense), `staff_id` and `khata_entry_id` (staff pay), the reason, `voids_id`
  (unique) and who and when. Append-only: `month_adjustments_append_only` on `forbid_change()`, the
  15th trigger. Applied to a restored local copy first, then to live **before** the code was pushed
  (`284d6a6`).
- `lib/accounting/adjustments.ts` — pure: `adjustmentEffect` (what one adjustment does to the profit,
  the online money, the Owner-paid costs and the khata) and `adjustmentTotals`. 9 tests.
- `lib/accounting/month.ts`, `month-report.ts` — `netProfit` takes the adjustments' profit;
  `ownerAccount` takes their Owner part; `MonthReport` gains `adjustments` and `adjustmentsToOwner`.
  A month closed before P3.4 has neither in its frozen report, so both are read with `?? 0`.
- `db/queries/month-report.ts` — the month's adjustments, cancellations included, added up.
- `features/month-adjustments/` — `schemas`, `rules` (when one may be recorded or cancelled, the
  khata labels, the one-line description, the form's words; 17 tests), `queries` (the rows a month
  shows, and where a new one would count or why none can be recorded), `service`
  (`recordAdjustment`, `cancelAdjustment`, one transaction each with the khata line and the audit
  entry: `month.adjust`, `month.adjust-cancel`), `actions` (`requireRole("owner")`), and two
  components: the dialog and the list with Cancel.
- Monthly report — the banner's button; a P&L line "Adjustments for earlier months" and the Owner
  account line, both only when non-zero; the footnote's sum; a list of the adjustments that count in
  the month, and on a closed month a list of those recorded later that correct it.
- `month-close/rules.ts` — the month-end blocker above (`lastDateOfMonth` in `lib/business-date.ts`).
- The refusals that used to say "correct it in the next month" (a closed day's cancel or reopen,
  Monthly expenses) now point at the adjustment; the Daily report and Monthly expenses of a closed
  month say so on the screen, with a link.

**Verified, 2026-09-29, against a restored copy of the live database in a throwaway local
PostgreSQL — nothing written to live** (HANDOFF trap 8.20; the Browser pane signed in as a
throwaway Owner that existed only in the copy). The copy's days were closed up to 30 Sep by a script
through `closeDay` and `startNextDay`, September was closed from the screen, and 1 Oct started:

| Check | Result |
|---|---|
| Month close with 24 Sep the last closed day | refused: "September 2026 is not over yet: it can be closed once 30 Sep is closed"; after 30 Sep, no blocker; closed from the screen, net profit -61,900 frozen |
| Between September's close and 1 Oct | banner: "The next business day has not been started yet…", no button |
| After 1 Oct | "Record an adjustment", counting in October 2026 |
| The dialog | no direction → "Choose more or less"; a staff kind with no one chosen → "Choose a staff member"; the effect shown before saving |
| Four recorded from the screen | sale Rs 1,000 less (cash); Arshad earned Rs 100 less; expense Rs 500 more (paid by the Owner); Sherry took Rs 2,000 less |
| October's report | "Adjustments for earlier months -1,400"; net profit -81,400 (salaries -80,000); Owner account line +500; balance -80,900; the footnote adds up. September's report unchanged, listing the four as "Counts in October 2026" |
| The khata | Arshad -100 and Sherry +2,000 on 1 Oct, labelled "Adjustment for September 2026: …" |
| Cancel from the screen (Arshad) | a +100 row pointing back, a +100 khata line with `reverses_entry_id`; Arshad's 1 Oct lines sum to 0; `month.adjust-cancel` in the audit log |
| Refused by the service | an adjustment already cancelled; a cancellation; the open month (October); a month with no days (August) |
| Two cancels at the same moment | one saved, one "This adjustment is already cancelled"; one cancellation row. A second cancellation row inserted by hand is refused by `month_adjustments_voids_id_unique` |
| Partners, October | net profit -81,000 → -40,500 each |
| October closed (31 days by script) | frozen report `adjustments: -1000`, `adjustmentsToOwner: 0`, shares -52,900 each; 0 of 6 adjustments cancellable; a cancel refused: "October 2026 is closed, and this adjustment with it" |
| Daily report, 24 Sep | the note with a link to September's Monthly report; no Cancel buttons |
| 375 px | the banner, the list as stacked cards, the dialog; the page does not scroll sideways |
| The trigger | UPDATE and DELETE on `month_adjustments` refused |

No server errors and no console errors during the run. The copy, its dump, the throwaway account and
the scripts were deleted afterwards, and the pane's IndexedDB copies, outbox (empty), worker and
caches checked clean.

`pnpm test` **638** (38 new), `pnpm lint` clean, `pnpm build` passes (36 routes).

**Not verified:** anything on the live database beyond the migration — `pnpm db:check` reads 21 of
21 applied. A direct read-back of live's new columns was refused by this session's permission mode,
so it rests on `db:check` and on the same SQL read back from the local copy.

**Not covered, deliberately:**

- **Owner cash** (cash the Owner took or added, recorded wrong) has no adjustment kind: it moves only
  the Owner account, and it is confirmed with the Owner's PIN when entered. **Partner drawings** and
  **capital repayments** are entered in the open month as usual.
- **A developer edit in a closed month (P1.6)** settles that day's khata again by itself. A staff
  adjustment on top of it would count the same commission twice; only the sale's difference belongs
  in an adjustment. HANDOFF section 9, question 0, still stands.
- A bill's commission is not worked out for the Owner: a wrong bill whose karigar earned commission
  on it is two adjustments, the sale and what they earned. The dialog's hint says so.

**Size:** medium · **Value:** high (spec §7.4; before it a closed month's mistake had no way out)

### ✅ P3.15 — A dropped connection never leaves a bill in doubt
**Done:** 2026-09-28

**Found on the live site, 2026-09-26, 22:19.** The manager pressed Save, the screen spun, then
showed the full-screen "This screen could not be loaded" card with *No reference was recorded*,
under the P2.2a "No internet" banner. The browser console read `TypeError: Failed to fetch`. The
bill **had been saved** — #32, Rs 1,800 — but the answer was lost on the way back, so the counter
could not tell, and saving again would have made a second bill. The cart was gone too: a rejected
Server Action inside a transition goes to the error boundary.

**Client decision (2026-09-26), through the user:** the proper fix, not a guess from amounts and
times — and before P2.2b.

**The fix:**
- Every bill gets an id from the browser (`bills.client_id`, unique — one migration). The server
  never saves the same id twice: a repeat, or two racing requests, get the bill that is already
  there. Pressing Save again is always safe. This is the id P2.2c was going to add, brought forward.
- A Save that loses its answer no longer throws the screen away. The cart stays, and the screen asks
  the server "did this bill arrive?" until it gets an answer: the receipt, or "not saved — press
  Save again".
- A screen left open across a deploy is told to reload, instead of being left waiting.

**What was built:**

- **Migration `0018`** — `bills.client_id uuid`, nullable, `bills_client_id_unique`. Applied to the
  live database **before** the code was pushed, read back from `information_schema` and
  `pg_constraint`, and pushed on its own (`b83c42d`). ADD COLUMN and a unique index touch no row,
  so the append-only triggers never fired. All 32 existing bills keep `null`, as do reversals.
- `schemas.ts` — `clientId` on `createBillSchema` (so on edits too): a uuid, **optional** so a
  screen loaded before the deploy still saves. `findSavedBillSchema` for the lookup.
- `queries.ts` — `findBillByClientId()`: the bill as a receipt, rebuilt through `getDayBills` and
  `receiptOfBill`, so it is the very receipt Today's bills reprints.
- `service.ts` — `createBill` and `editBill` return `SavedBill` (`{ receipt, alreadySaved }`).
  `savedEarlier()` answers a repeat with the bill already there; `lostTheRace()` answers the loser
  of two simultaneous requests the same way, recognised by `isUniqueViolation()` (SQLSTATE 23505,
  looked for down Drizzle's `cause` chain — `lib/errors.ts`, tested). On an edit the check runs
  **before** the guards, or a repeat would be told "already cancelled" — true, by itself.
- `actions.ts` — `findSavedBillAction`: "did the bill sent under this id arrive?"
- `billing-screen.tsx` — the id lives in state until the server is known to have the bill. A Save
  that throws is caught: `unstable_isUnrecognizedActionError` means a stale deploy (never ran,
  "reload"); anything else puts the bill **in doubt** — a warning box, Save off and reading
  "Checking whether it was saved...", the cart kept — and the screen asks every 4 s
  (`useEffectEvent`) until it can say: the receipt with "had reached the server and is saved. Do
  not save it again", or "was not saved. Press Save to send it again". Not at once: a request cut
  off on the way back may still be finishing on the server.

**Verified, 2026-09-28** — three test bills on the open day (24 Sep), each with a new made-up
customer (`00000315001`–`003`, "Test customer P3.15 A/B/C"), a Hair wash, an Other line of Rs 200
and a Rs 50 discount, with the user's permission:

| Test | How | Result |
|---|---|---|
| Two Saves of one bill at the same instant, then a third | a script calling `createBill` with one `clientId` (`Promise.allSettled`), actor `p3.15-check` | **#33** once; the twin got `alreadySaved: true` for #33, the third too. One bill with that id, one customer with that phone — the twin lost the race on the new customer's unique phone, inside its transaction, and was answered with #33 |
| The answer lost on the way back | in the Browser pane, signed in as the manager, `window.fetch` patched to send the Save and then throw `Failed to fetch` | server answered 200; 4 s later the screen asked and said "bill **#34** had reached the server and is saved"; receipt shown, cart cleared, no error card |
| The request never sent | the same patch throwing before sending | the warning box and "Checking whether it was saved..." at once, cart kept; 4 s later "was not saved. Press Save to send it again"; Save again → **#35**, once |

Read back from the database afterwards: exactly three bills in those hours, three distinct
`client_id`s, one bill per test customer, three `bill.create` audit rows. `pnpm test` 411
(11 new), `pnpm lint` clean, `pnpm build` passes.

**Not verified:** the "app was updated, reload" message — it needs a real deploy to go stale
under an open screen.

---

### ✅ P3.16 — The customer box keeps the last bill's number after a save
**Done:** 2026-09-28

Found while verifying P3.15 (2026-09-28). After a bill is saved the screen resets the customer,
but the mobile number box still shows the previous bill's number. Typing the next customer's
number appends to it (`0000031500200000315003`), and Find then says "Enter a valid mobile
number". Not caused by P3.15 — the success path resets the customer the same way it always did.

**Why:** `CustomerBox` keeps the number being typed in its own `useState`. Setting the `customer`
prop back to "none" brings the search input back, but the box was never unmounted, so its state —
the old number — came back with it.

**The fix:** one line in `billing-screen.tsx`, `<CustomerBox key={clientId} …>`. The bill's id
(P3.15) changes exactly when the server is known to have the bill and the next one begins, so the
box starts empty then. While a Save is in doubt, or comes back "not saved", the id stays, and so
does the number typed.

**Verified, 2026-09-28, with nothing written to the database** (35 bills before and after). In
the Browser pane, signed in as the manager on the dev server: the screen was mounted with bill
#35's `client_id`, customer `00000315003` found, a Hair wash added, and the Save blocked in
`window.fetch` before it was sent. The screen asked, the server answered with #35, and the screen
took the saved path — the same `afterSave` a normal Save runs. How: HANDOFF trap 8.16.

| Run | The mobile box after the save |
|---|---|
| Fix reverted for the run | `00000315003` — the bug, reproduced |
| With the fix | empty; `00000315002` then typed cleanly and Find found "Test customer P3.15 B", no error |
| With the fix, a Save the server never got | "was not saved. Press Save to send it again" — the typed `03001234567` and the bill's id both kept |

`pnpm build`, `pnpm test` (434, none new: the tests cover `src/**/*.test.ts` only, and there are
no component tests) and `pnpm lint` pass.

**Not verified:** a real Save reaching the server — it would put a bill in the live books
(HANDOFF 9a). It runs the same `afterSave`.

---

### ✅ P3.6 — Receipt printing
**Done:** 2026-09-22

Spec §5.1: *"Every bill prints a receipt."* The slip was already drawn on screen and the dialog
said *"Receipt printing is not connected yet."* **This was a small item, not the medium the table
claimed** — the markup existed; only a way to put it on paper did not.

**What was built:**

- A **Print** button on the receipt dialog. It is plain `window.print()`, and the rules in
  `globals.css` hide everything except the element marked `data-print-receipt` — so the browser
  prints the same markup the counter just looked at, rather than a second copy built for paper
  that could drift out of step.
- **Reprint from Today's bills.** Printing only at the moment of sale is not enough: the printer
  may be out of paper, the print dialog may be cancelled, or the customer may ask for the slip
  after the next bill has been started. Every active bill now has a Print button.
  **It needs no query** — `DayBill` already carries every field a receipt shows.
- `receipt-of-bill.ts` — the pure mapping from a saved bill back to a receipt, with 5 tests.
- The dialog heading adapts: *"Bill #12 saved"* with the green tick at the sale, *"Receipt for
  bill #12"* on a reprint, so a reprint never claims a sale just happened.
- The slip is marked `data-print-receipt` **only while its dialog is open**. A dialog takes about
  a second to animate out, and a second receipt opened in that window would otherwise have put two
  slips on one sheet.

**Paper size:** the slip prints 72 mm wide with a 4 mm page margin — it fits an 80 mm thermal roll
and comes out as a slip in the corner of A4. No thermal printer was available to test on.

**Two traps this cost time on**, both now in `docs/HANDOFF.md` section 8:
Lightning CSS silently drops `translate` when `transform` sits in the same rule, and `next dev`
serves a stale Tailwind bundle when only a `.tsx` file changes.

**Verified in the browser** against the dev database, not only in tests: bill #18 and #17
reprinted with the right lines, staff names and totals; the print rules measured against the live
DOM hide 8 of the 9 top-level branches and spare exactly the one holding the slip; with no receipt
on screen they hide nothing, so printing any other page is unaffected; and
`.print:translate-none` was confirmed to come after Tailwind's own centring class in the
compiled stylesheet, which is what makes it win.

**Not verified, and worth doing once:** nobody has put this on actual paper. Press Print and check
the slip against a real printer before the trial.

**Still open, deliberately:** a reversal or cancelled bill has no Print button, and the daily
report does not print. Neither is a receipt for a customer.

**202 tests pass** (was 197), lint clean, build passes.

---

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

### ✅ P4.1 — One shape for every feature, and a test that keeps it
**Done:** 2026-09-23

The item asked for "one convention" for the pure-logic files. Writing another
convention into `docs/ARCHITECTURE.md` was not worth doing: **the convention was
already in that file and the code drifted from it anyway**, because a document
cannot fail a build.

**What was built:** `src/features/conventions.test.ts` reads the feature folders
and checks the rules:

| Rule | What fails |
|---|---|
| Five names mean something | `actions.ts`, `service.ts`, `queries.ts`, `schemas.ts`, `types.ts`. Everything else in a feature is pure logic |
| A feature holds nothing else | no `.tsx` directly in the folder, no subfolder except `components/` |
| `actions.ts` is an entry point | starts with `"use server"` and calls `requireUser`/`requireRole` |
| Pure files stay pure | no `"use client"`/`"use server"`, and no **value** import of `@/db`, `react` or `next`. `import type` is fine — a type vanishes at build |
| Pure logic is tested | a test in the same folder imports it |
| No cross-feature imports | `ARCHITECTURE.md` rule 5, which had only ever been measured by hand |

**It deliberately does not** demand all five files in every feature.
`overview` has no writes and `month-close` has no schemas; empty files to satisfy
a rule would be worse than the rule. That is written into the test's own comment
so the next person does not "fix" it.

**The test was broken on purpose to prove it works** — a test that has never
failed is decoration:

| Mutation | Result |
|---|---|
| `import { db } from "@/db"` added to `month-close/rules.ts` | ✗ *month-close/rules.ts imports @/db at runtime* |
| `overview/alerts.ts` importing `@/features/staff-khata/rules` | ✗ *no feature imports another feature* |
| a new pure file with no test | ✗ *overview/untested.ts is pure logic with no test importing it* |

All three were reverted. The tree passes as it stands: **70 checks**, and the
test count went from 238 to **308**.

`docs/ARCHITECTURE.md` now states rules 9 and 10 and says which rules the test
enforces.

**Size:** small · **Value:** medium (it stops the drift rather than describing it)

---

### ✅ P4.3 — `features/auth` merged into `features/account`
**Done:** 2026-09-23

Three folders were called some form of "auth": `features/auth`, `lib/auth` and
`features/account`. The first held **one file** — the login form.

`login-form.tsx` moved to `features/account/components/`, the login page's import
followed it, and `features/auth` is gone. `lib/auth` keeps its name, because it
really is about who is signed in; `features/account` is the screens.

Verified by running the app: `/login` renders the form, the username and password
fields and the Sign in button, after clearing `.next` (trap 8.0b).

**Size:** small · **Value:** medium (one less thing to mistake for another)

---

### ✅ P3.7 — Backup and restore
**Backup done:** 2026-09-23 · **Restore verified:** 2026-09-29, into a local copy (the user's call: enough)

There was **no backup of any kind** — no script, no schedule, nothing to restore
from, on a system whose whole job is to be the salon's book of accounts. Spec
phase 4 asks for backup/restore, with the success test *"restore from backup
verified"*.

**What was built:**

- `pnpm db:backup` → `backups/art-man-<timestamp>.dump`, one file in `pg_dump`'s
  custom format. `backups/` is git-ignored: the file holds every bill, every
  customer's phone number and the password hashes.
- It finds `pg_dump` on `PATH` or in the standard Windows install folder,
  and `PG_DUMP` overrides both. It prefers `DATABASE_URL_UNPOOLED` and says so
  when it has to fall back to the pooled string.
- `docs/BACKUP.md` — how to take one, how to read one without restoring it, how
  to restore, and when to take one by hand until this is automated.

**Measured, not assumed.** The first backup is 75 KB and holds **31 tables with
data**, including `drizzle.__drizzle_migrations`, so a restored database knows
which migrations it has. `pg_restore --list` reads it: **14 triggers**, the 3
trigger functions, 4 enums, 61 constraints. The data matches the database it
came from — **19 bills**, **31 khata lines**. `pg_dump` 18.4 worked against
Neon's PostgreSQL 18.6, and even through the **pooled** connection.

**What is NOT done, and it is the half the spec actually asks for:** nobody has
restored it. There is no second database to restore into — `.env.local` is the
live one, and a local PostgreSQL is running here but its password is not known.
**Do one restore into a throwaway Neon branch before the trial starts.** Until
then the backup is untested, and `docs/BACKUP.md` says so in those words.

**2026-09-29, while verifying P2.2f (not this item's work, recorded because it
changes the paragraph above):** a fresh `pnpm db:backup` of live **was
restored** — into a throwaway cluster made with `initdb` in the session's
scratchpad (PostgreSQL 18.4, trust sign-in, port 5544, so no password was
needed; the machine's own PostgreSQL service was not touched). `pg_restore
--no-owner --no-privileges` finished without an error, and the copy held **30
tables, the 14 triggers, 20 migrations, 42 bills** and 24 Sep open, as live did.
The built app then ran against it for a whole P2.2f session — sign-in with the
existing session, billing, folders, four days closed — and `verifyDayCode`
recomputed every closed day's security code from the restored rows. The
cluster was deleted afterwards (HANDOFF trap 8.20). Still not done: a restore
into Neon itself, and `docs/BACKUP.md` has not been changed. Whether this is
enough for spec phase 4's "restore from backup verified" is the user's call.

**2026-09-29, closed — the user's decision.** A second restore of a fresh
backup ran the same day, for P3.4's testing: again clean, 30 tables, 14 triggers,
20 migrations and 43 bills; migration `0020` then applied on top of it, and the
app ran against it for the whole session. Asked whether to restore into a
throwaway Neon branch as well — which needs access to the Neon account, by a
`neonctl` sign-in or a branch made by hand — the user answered **"rehne dein"**:
the local restores are enough for spec phase 4's "restore from backup
verified". `docs/BACKUP.md` now records both restores and how they were done.

**Not done, deliberately:** a restore into Neon itself. The first real one — the
move to a VPS, or an incident — is where anything particular to a managed
server (its roles, its ownership rules) would show, so watch that one.

**Not automated either.** Somebody has to run `pnpm db:backup`. A schedule needs
somewhere to put the files that is not this laptop — worth settling together
with the Vercel/VPS question. **Moved to P5.3 (2026-09-29).**

**Size:** medium · **Value:** high

---

### ✅ P3.11 — A service can have a price range *(client asked for it 2026-09-23)*
**Done:** 2026-09-23

The salon's real printed price list has a **range** against most services, not
one price. From the photo the client sent:

```
HAIR CUT (SIMPLE)          250          <- one price
HAIR CUT (FADES)        300 - 500       <- a range
BEARD (SIMPLE)          200 - 250
HAIR PROTEIN            500 - 2500
FASHION COLORS          500 - 999
```

What is charged inside the range depends on what was actually done, so the
**counter picks the amount when the bill is made**. Today a service has exactly
one price and the counter cannot change it, which is why the app cannot yet
price this salon's own list.

**How it fits what is already there:** the Owner still sets the prices (spec
§10.4) — the range *is* the Owner's decision, and the counter may only choose
inside it. A customer's special rate still wins over both, because that is a
price the Owner fixed for that person.

**What was built:**

| Where | What |
|---|---|
| `services.max_price` | migration `0017`, one `ADD COLUMN`. Null keeps today's behaviour exactly: one fixed price |
| Staff & rates | the service form's price field becomes **Lowest price** as soon as a **Highest price** is typed; blank means one fixed price. The list shows `300 – 500` |
| Billing tiles | `Rs 300 – 500` instead of one figure |
| The cart line | an **amount box** with the range under the service's name, `min`/`max` set, and the bottom of the range as the placeholder |
| `priceCart` | the one place that decides. An amount outside the range is refused by name — *"Hair cut (fades) must be between Rs 300 and Rs 500"* — and an amount sent for a fixed-price service, a deal line or a special rate is **ignored**, never trusted |
| Re-opening a bill (P1.4) | the line comes back on what it was charged, not on the bottom of the range |
| A deal | splits on the bottom of the range, because the deal's own price is what is paid and there is nothing to choose |

**Nothing downstream changed.** Commission, the khata, the day's sale and the
month's profit are all built from the line amounts, and the chosen amount *is*
the line amount.

**Two real defects were found by using it, not by reading it:**

1. Typing an amount outside the range made `priceCart` throw, which left every
   priced line undefined — and **the amount box vanished**, so the number that
   caused the problem could not be corrected. The box now comes from the
   service and the customer's rates, never from the priced line.
2. In the same state **the service's name disappeared** from the row, leaving a
   blank line. It now falls back to the catalog's name.

**Verified in the browser** against the dev database, with the salon's own
figures from the client's photo: Haircut was set to **300 – 500** in Staff &
rates; the billing tile read `Rs 300 – 500`; a fresh line priced at **300** with
nothing chosen; **450** gave a total of Rs 450; **600** showed *"must be between
Rs 300 and Rs 500"* while keeping the box, its value and the line's name; and
**bill #23** saved with a line of exactly **450**.

**Size:** medium · **Value:** high (the app could not price this salon's own list)

---

### ✅ P3.10 — Discount on a bill *(client asked for it 2026-09-23)*
**Done:** 2026-09-23

The counter needs to be able to take money off a bill: an **open field on the
billing screen**, filled in by the **Manager or the Owner** themselves, and the
discount has to carry through the whole of the accounts.

**This reverses a recorded client decision.** Spec §10.4 and the 2026-09-22 Q&A
both say *"Manager cannot give discretionary discounts — only Owner-set rates
apply"*. The client asked for the opposite on 2026-09-23 and was told it
contradicts the spec. Their answer stands: both roles may give one. The spec
file is not edited — it is the client's document — but this is the decision the
code follows, and it is recorded here and in `docs/HANDOFF.md` section 6.

**The two decisions taken before building** (asked, because both change real
figures):

| Question | Answer |
|---|---|
| Commission on which amount? | **On the discounted amount.** Rs 1,000 of work with Rs 200 off earns commission on Rs 800. This is spec §10.1 — *"commission is on the amount actually charged"* — so a discount is shared by the salon and the karigar |
| What kind of field? | **One open field, whole rupees, on the whole bill.** Not a percentage, not per line. Each line's share is worked out proportionally, the same way a deal price is split |

**What that answer buys.** Because the commission follows the discounted amount,
the discount is **allocated into the line amounts** at pricing time. Everything
downstream then needs no change at all and cannot drift: `workByStaff` sums line
amounts, so commission and the khata follow; `salesTotals` adds cash and online,
so the day's sale is already net; the month report is built from the day
snapshots. `bills.discount` is kept beside it for the receipt and the reports,
never as the source of any total.

**What was built:**

| Where | What |
|---|---|
| Billing screen | **Discount (Rs)** field under Items, with Subtotal / Total above and below it. A reason box appears as soon as the amount is not 0 |
| `priceCart` | takes the discount and splits it across the lines with `allocate` — the same largest-remainder split a deal price gets, so the parts add up to exactly the discount and no line can go below 0 |
| `bills.discount` · `discount_reason` | migration `0016`, two `ADD COLUMN`s. Kept for the record, never used as the source of a total |
| Receipt | *"Includes a discount of Rs 300 (1,100 before)"* under the total. The listed prices are already net, so the slip says it in words rather than printing a subtraction the lines would contradict |
| Daily report | a **Discount given** card, shown only on a day that had one |
| Today's bills · Daily report | a quiet **Discount 300** line under the services, with the reason on hover, from one shared `components/discount-note.tsx` so the two tables cannot drift. The Daily report also strikes the pre-discount amount through above what was charged — **2,000 → 1,700**. Added 2026-09-23 on the client's word: nothing else in a row shows a discount, because the cash and the line amounts are already net of it, so a discounted bill looked like a cheap one. It was a yellow badge first and the client rejected it: badges in these tables mean *status*, and a discount is not a status |
| Reversal bill | carries the negative discount, so a cancelled bill nets out in that column too |
| Owner's edit (P1.4) | the draft carries the discount back, so re-opening a discounted bill does not quietly put the price up |
| Developer's edit (P1.6) | shows what the discount was and says the line amounts already carry it |
| Audit | `bill.create` records the discount and its reason |

**A reason is required.** The spec did not want discretionary discounts at all;
since the client does, the reason is the control that replaces the rule, and it
is the same standard a cancellation is already held to.

**Verified in the browser, signed in as a Manager** — the role the spec would
have refused:

1. Haircut Rs 800 + Hair wash Rs 300 = **Rs 1,100**, discount **Rs 300**.
2. The lines on screen became **582** and **218** — the split, live, before
   saving. Subtotal Rs 1,100, Total Rs 800.
3. Saving with no reason was refused: *"Say why the discount is being given"*.
4. Saved as **bill #20**. In the database: `discount=300`,
   `reason="Regular customer"`, lines 582 + 218 = **800**, which is what was
   paid. The audit row carries both.
5. The receipt, and the **reprint** from Today's bills, both read *"Includes a
   discount of Rs 300 (1,100 before)"*.
6. The daily report shows **Discount given Rs 300**.
7. **Day close reads Sherry's work as Rs 1,100**, not Rs 1,400 — 300 (an earlier
   bill) + 800 (this one). That single figure is the client's decision working:
   commission is on what was actually charged.
8. A discount of Rs 5,000 on a Rs 800 bill is refused on screen —
   *"A discount must be less than the bill total of Rs 800"* — and the rest of
   the bill keeps working while it is being fixed.

The throwaway Manager account was deleted. Bill #20 stays: bills are
append-only, and it is dev data.

**Deliberately not done:** the discount is not a percentage, is not per line,
and the developer's edit screen cannot change it. Each is a decision, not an
oversight.

**328 tests pass** (was 308), lint clean, build passes.

**Size:** medium · **Value:** high (asked for directly by the client)

---

### ✅ P3.2 — Customers screen: details and special rates
**Done:** 2026-09-23

Two gaps closed by one screen, because both are about a customer and neither had
anywhere to live:

- **Special rates.** Billing has always read `customer_special_rates` and priced
  against it, but nothing could write one — they arrived through
  `pnpm db:seed:sample` and no other way. Spec §10.4: a rate is the Owner's
  decision, never the counter's discretion.
- **Name and phone.** Spec §11 says a customer's name and phone are the only
  things that may be edited, *with a record*. There was no way to fix either,
  so a name typed wrong at the counter stayed wrong for good.

**What was built** — `/customers`, Owner-only (`requireRole("owner")`, and the
nav entry sits in the Owner section):

- A searchable list (name or phone, 50 at a time) beside one customer's card.
- **Edit details** — name and phone, nothing else. A phone number that belongs
  to somebody else is refused by name: *"03001234567 already belongs to another
  customer."* The audit row carries `before` and `after`.
- **A rate per service**: every active service, its list price, and what this
  customer pays. Set, change, or remove back to the list price. The write is an
  upsert on the `(customer, service)` primary key, so setting a rate twice
  corrects it instead of failing.
- A customer is never deleted — bills point at them.

**Verified in the browser** as an Owner, against the dev database:

1. Kamran had no special rate. Set **Haircut Rs 650** against a list price of
   Rs 800.
2. On the Billing screen, looked Kamran up by phone: the **Special rate** badge
   appeared, and adding Haircut priced the line at **Rs 650**, not Rs 800. That
   is the whole point of the feature and it was measured, not assumed.
3. Renamed him to "Kamran Bhai" and back; tried to give him Ashfaq's phone
   number and was refused with the message above.
4. Removed the rate: the row went back to "List price" and Rs 650 disappeared.

The four `audit_log` rows read back with both sides:
`customer.rate-set` (`null` → 650), two `customer.edit` (name → name), and
`customer.rate-remove` (650 → list price). The database ended where it started:
one special rate, Kamran's name restored. The throwaway Owner account was
deleted.

**A question for the client, not a defect:** the screen is Owner-only. A Manager
cannot fix a customer's name at the counter, which follows spec §10.4 on prices
but is stricter than §11 needs to be for a name. Ask before loosening it.

**Size:** medium · **Value:** high (a dead read path, and a spec requirement)

---

### ✅ P3.1 — Give a bonus
**Done:** 2026-09-23

`khata_kind` has had `bonus` since migration `0000` and the ledger sorts it, but
nothing in the app could create one. Spec §10.10: **only the Owner** gives
bonuses.

**What was built:**

- A **Give bonus** button on the Staff khata screen, in the selected person's
  ledger header. It is rendered only for the Owner (`atLeastOwner`), and the
  Server Action is `requireRole("owner")` besides — the screen hiding a button
  is not a permission check.
- `rules.ts` — pure: a bonus is refused for an inactive member and in a closed
  month. 6 tests.
- `service.ts` — one `khata_entries` row of kind `bonus` and one `audit_log`
  row (`khata.bonus`), in one transaction.

**No cash and no migration.** A bonus is money the salon now owes; handing it
over is an ordinary staff payment in the day's folders, exactly as with
commission. That separation is what lets a bonus be given on a day that is
already closed: it touches neither the drawer, nor that day's closing figures,
nor its security code.

**The part that was nearly missed: the profit.** A bonus is a khata line, so it
is *not* in any day snapshot — and the monthly report was built from snapshots
alone. Left there, a bonus would never have reached net profit at all. So
`buildMonthReport` now takes `bonuses`, counts them with the other staff
earnings, and `getMonthlyReport` sums the month's `bonus` rows. The P&L shows
its own line, and the footnote under Closed days spells the subtraction out.

**Verified in the browser** against the dev database, signed in as an Owner:
Arshad's khata went from Rs 30 to **Rs 530** with the line *"Bonus: Eid bonus
+500"* dated 24 Sep, and the monthly report moved from -Rs 79,890 to
**-Rs 80,390** with *"Bonuses given (Owner) -500"*. Signed in as a Manager, the
same screen renders the ledger and **no Give bonus button**.

Throwaway Owner and Manager accounts were used and deleted afterwards. The
bonus khata row stays — it is append-only, and it is dev data.

**Still open, deliberately:** the daily report does not show bonuses, because a
bonus is not a day-close figure. It appears in the khata and in the month.

**Size:** small · **Value:** medium (a dead path in the schema, and a client
decision from the Q&A)

---

### ✅ P3.9 — Audit failed logins
**Done:** 2026-09-23

Spec §11: the audit log holds *"who / when / what for every important action,
**including failed attempts**"*. A wrong PIN (`pin.wrong`) and a wrong current
password (`password.wrong`) were recorded. A wrong **login** was recorded
nowhere — somebody guessing at the owner's password left no trace at all.

**What was built:**

- `src/lib/auth/login-audit.ts` — the pure decision: which sign-in attempt
  becomes which row. 7 tests.
- An `after` hook in `src/lib/auth/server.ts` writes it. Successes go in as
  well (`login.ok`), because a failure count means little without the
  successes around it, and "who signed in and when" is the other half of the
  question the log is asked after a disputed entry.
- A log that cannot be written never stops a sign-in: the insert is wrapped and
  the error goes to the logger.

**Why an `after` hook can see a failure:** when an endpoint throws an
`APIError`, the dispatcher catches it, puts it in `ctx.context.returned` and
*then* runs the after hooks — read in `better-auth/dist/api/dispatch.mjs`, not
assumed. So a refused sign-in is an ordinary return value there.

**Verified against the running app**, not only in tests. A throwaway account was
created, four attempts were made over HTTP, and the rows were read back:

| Attempt | HTTP | Row |
|---|---|---|
| wrong password | 401 | `login.failed` · `INVALID_USERNAME_OR_PASSWORD` |
| username that does not exist | 422 | `login.failed` · `INVALID_USERNAME` |
| correct password | 200 | `login.ok` · success |
| correct password, account closed | 403 | `login.failed` · `ACCOUNT_CLOSED` |

The throwaway account was deleted afterwards (`pnpm db:check` reads 3 accounts
again). Its four `audit_log` rows stay — that table is append-only and cannot
be cleaned, which is the point of it.

**Size:** small · **Value:** high (a spec requirement that was simply missing)

---

## P4 — Cleanup (no behaviour changes)

| | Item |
|---|---|
| ✅ P4.1 | **One shape for every feature** — done 2026-09-23, and the convention is now a test. See below |
| ✅ P4.2 | **Rewritten 2026-09-23.** Was: — it is currently wrong: it says `db/schema.ts` when the reality is a `db/schema/` folder, and never mentions `db/queries/`, `service.ts` or `types.ts` |
| ✅ P4.3 | **Merged `features/auth` into `features/account`** — done 2026-09-23. See below |
| ✅ P4.4 | **Done 2026-09-23.** Deleted: `src/components/coming-soon.tsx`, `src/features/.gitkeep`, `docs/~$iend_Setup_Guide.docx` (a Word lock file), `@neon/env` (unused dependency), `neon.ts` (empty config) |
| ✅ P4.5 | **Done 2026-09-23.** Moved `shadcn` from `dependencies` to `devDependencies` — it is a CLI and bloats the production install |
| ✅ P4.6 | **Error and loading screens** — done 2026-09-22. See below |
| ✅ P4.7 | **CI on every push** — done 2026-09-22. See below |
| ✅ P4.8 | **Done 2026-09-23.** The flag is gone; `scripts/load-env.ts` reads `.env.local` instead, and an environment variable still wins — verified by pointing `db:check` at another host |
| ✅ P4.9 | **Index the financial tables** — done 2026-09-22, migration `0013`. See below |
| ✅ P4.10 | **Staff khata reads the whole `khata_entries` table** — done 2026-09-22, migration `0014`. See below |

### ✅ P4.9 — Index the financial tables
**Done:** 2026-09-22 · migration `0013_index_financial_tables`

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
- `khata_entries.staff_id` — the Staff khata screen read the **whole** table and grouped in memory,
  so no index could have helped. **Superseded by P4.10**, which gave it a query that filters on
  `staff_id`; migration `0014` then indexed it.

**No behaviour changes.** Adding an index cannot alter a result, only the time it takes. That is
also why **this migration is safe to push before it reaches live**: the code does not need it. It
is the opposite of the usual rule in `docs/DEPLOY_VERCEL.md` §0.1 — but live should still get it.

**Verified against the database, not assumed.** All seven were created, then each query from the
code was planned with `enable_seqscan = off` inside a rolled-back transaction — which proves the
index *fits the query shape*, the real risk with a composite index in the wrong column order:

| Query | Planner picked |
|---|---|
| a day's bills in receipt order | `bills_business_date_bill_no_idx` |
| the customer lookup | `bills_customer_id_idx` |
| a bill's lines | `bill_lines_bill_id_idx` |
| a day's folder entries in order | `cash_entries_business_date_created_at_idx` |
| a day's khata lines | `khata_entries_business_date_idx` |
| the audit page, newest first | `audit_log_created_at_idx` (Index Scan **Backward**) |

The wrong-PIN counter was the one that did not, at first: with 27 rows the planner ignored the
composite index and filtered instead. So it was re-planned against **18,000 generated audit rows**
(inserted, `ANALYZE`d, then rolled back — `audit_log`'s trigger is `BEFORE UPDATE OR DELETE`, so a
rollback never trips it). With real statistics it becomes an **Index Only Scan** on
`audit_log_action_target_created_at_idx`, never touching the table. Both audit indexes earn their
place; the table was left at its original 27 rows.

**Worth knowing:** a plain `CREATE INDEX` locks the table against writes while it builds. It is
instant on an empty database and this one is not live yet — but if these ever have to be rebuilt on
a running salon, use `CREATE INDEX CONCURRENTLY` by hand instead.

**Found while doing this:** the Staff khata screen read the entire `khata_entries` table and
grouped in memory. Not fixed here — it became **P4.10**, done the same day.

192 tests pass, lint clean, build passes.

**Size:** small · **Value:** medium (high once there is real data)

### ✅ P4.10 — Staff khata reads the whole ledger table
**Done:** 2026-09-22 · migration `0014_index_khata_by_staff`

Found while doing P4.9, which is why no index was put on `khata_entries.staff_id`: there was no
query that could have used one.

`getKhataData()` in `src/features/staff-khata/queries.ts` runs
`db.select().from(khataEntries)` — **no `where` at all** — then in JavaScript sorts every row,
sums a balance per staff member, and throws away all but one person's lines. The screen needs two
things and neither of them wants the whole table:

- **one number per staff member** for the left-hand list — that is a `sum ... group by staff_id`,
  about five rows;
- **one person's ledger** for the right-hand panel — that is `where staff_id = ?`.

The table gains three to six rows a day and is never pruned, so the work grows every day the salon
opens while what is displayed stays the same size.

It also waits three times in a row: the two selects, then `getLatestBusinessDay()`, then
`isMonthClosed()`, each depending on nothing but the last.

**What was built:**

- The balances are a `sum(amount) … group by staff_id` — one row per staff member, about five.
- The ledger is `where staff_id = ?`. Which member that is depends on the staff list, because an
  unknown `?staff=` falls back to the first, so it is a second round trip — but it is paired with
  `isMonthClosed()`, and `getLatestBusinessDay()` moved up into the first batch. **Two waits
  instead of three**, on a fraction of the rows.
- `KIND_ORDER` and the running balance stayed in JavaScript, now behind a named `inLedgerOrder`
  comparator. The rule — money in before money out within a day — is domain logic, and it now
  sorts one person's lines rather than the table.

**`sum()` returns a string.** Postgres sums an integer column as `bigint`, and `pg` hands that back
as text, so a balance would have arrived as `"30"`. Confirmed against the database, then fixed with
`.mapWith(Number)`. The kind of thing that reads fine and renders fine and is still wrong.

**Proved identical, not assumed.** A script ran the old logic and the new one side by side against
the dev database and compared every balance and every ledger row id, in order:

```
Arshad   balance old=30 new=30   ledger  7 rows  MATCH
Hamid    balance old=0  new=0    ledger  0 rows  MATCH
Sherry   balance old=-10 new=-10 ledger 23 rows  MATCH
```

Then `getKhataData()` itself was run through `tsx`: every balance came back `typeof=number`. Then
the screen was opened in a browser for both Arshad and Sherry — 7 and 23 rows, running balances
ending at the balances shown in the list, earnings before adjustments before payments within each
day. Hamid, who has no khata rows at all, correctly reads 0 rather than being missing.

**The index was decided on the query plan.** Against **10,000 generated rows** (inserted,
`ANALYZE`d, rolled back):

| Query | Plan |
|---|---|
| one person's ledger, no index | Seq Scan |
| one person's ledger, with `(staff_id)` | **Bitmap Index Scan** — earns its place |
| the balances `group by`, with `(staff_id)` | Seq Scan |
| the balances `group by`, with `(staff_id, amount)` | **still Seq Scan** |

So the migration adds `(staff_id)` only. The wider index was rejected by measurement: the balances
query has to read every row whatever happens, and with a handful of distinct staff a hash aggregate
over a sequential scan beat an index-only scan even when one was offered.

**Size:** small · **Value:** medium

---

### ✅ P4.6 — Error and loading screens
**Done:** 2026-09-22

A database error showed Next's own black-and-white error page, and a slow screen
showed the previous one with no sign anything was happening. Neither belongs in front of a salon
manager.

| File | Catches |
|---|---|
| `src/app/error.tsx` | everything below the root layout — including `(app)/layout.tsx`, where `requireUser()` touches the database, and the login page. Stands alone: when the shell is what failed there is no sidebar to show |
| `src/app/(app)/error.tsx` | a signed-in screen. Sits inside the shell, so the sidebar stays and the counter can go elsewhere instead of being stranded |
| `src/app/global-error.tsx` | the root layout itself. Next loads no global styles here, so every style is inline on purpose |
| `src/app/(app)/loading.tsx` | a skeleton for all fourteen signed-in screens |
| `src/app/not-found.tsx` | a mistyped address |
| `src/components/error-card.tsx` | the wording, shared by the two error pages |

**The wording follows P0.1:** a system fault must never read as something the person did, and
support must be left with something to go on. The screen names the database, says nothing entered
has been lost, points at the paper bill book, and shows the digest. The whole error object goes to
the browser console.

**In Next 16 the error boundary prop is `retry`, not `reset`.** `retry()` re-fetches and
re-renders; `reset()` only re-renders. Had the old name been used the prop would simply have been
undefined and the button would have thrown.

**Verified in a browser**, by making a page throw and then the layout throw: the page error keeps
the sidebar, the layout error does not, and **the digest on screen matched the one in the server
log**. Pressing Try again after the fault was removed brought the real screen back, which is what
proves `retry` is wired. The 404 and the loading skeleton were checked against a **production
build** as well.

**Not exercised:** `global-error.tsx`. Triggering it needs the root layout to fail.

**Size:** small

---

### ✅ P4.7 — CI on every push
**Done:** 2026-09-22 · `.github/workflows/ci.yml`

Two developers work directly on `main`, in separate repositories, with no PR review — nothing
caught a bad push except the next person to pull.

Lint, then test, then build, on every push to `main` and every pull request. That is the reverse
of the local order in the working agreement, deliberately: the slowest step goes last so a broken
push fails in seconds rather than minutes.

- **No secrets, no environment variables.** The build needs none (measured, and the reason a green
  build proves nothing about the deployment) and the tests never touch a database.
- pnpm comes from `packageManager` in `package.json` via `pnpm/action-setup`, so the pinned
  version lives in one place.
- Node is pinned to **22** — the LTS the deployment runs, not whatever is on a laptop.

**Verified:** `pnpm install --frozen-lockfile` was run locally first, since it is the step most
likely to fail only in CI; the YAML was parsed rather than eyeballed; and after pushing, the first
run was watched to completion through `api.github.com/repos/Sakib543/art-man/actions/runs` —
**green in 56 seconds** on commit `0f74808`.

**Worth knowing:** GitHub disables Actions on a forked repository by default, and this working copy
is a fork. Here they were already on. If a run never appears, that is the first thing to check.

**Still worth adding:** a branch protection rule, so a red run actually blocks. Not possible today
— nobody merges through PRs, and the rule set that would enforce it needs repository admin.

**Size:** small

---

## P5 — Deployment

| | Item |
|---|---|
| 🟡 P5.1 | **Go live on Vercel** — env vars, then migrate + seed on the Neon `live` branch. The build itself already passes (verified). **Blocked on access, not on code:** the Vercel project exists and is connected to this same repo, but it lives in the **other developer's** Vercel account (answered 2026-09-22). Nobody here can open Settings to set the environment variables. First step is to be added to that project, or to have it transferred |
| ✅ P5.2 | **`docs/DEPLOY_VERCEL.md` rewritten** — done 2026-09-22. It now has the two steps it never had (`db:migrate` and `db:seed` against the live branch, with the commands), in both bash and PowerShell. Fixed as well: the stale "staff with PINs" line (P1.0 removed it), a warning never to run `db:seed:sample` on live, that a push to `main` deploys by itself so a migration must reach live first, that a green build means nothing because the build passes with no env vars at all, and a measured table of which variable is read where. `.env.example` also said `DATABASE_URL_UNPOOLED` was used by the seed scripts — it is not, they read `DATABASE_URL`, and seeding the wrong database is exactly the mistake that comment invites |
| ⬜ P5.3 | **Move to a VPS** — after the client signs off. Postgres on the same VPS; carry the trial data over with `pg_dump`. With it, **a scheduled backup** kept somewhere that is not this laptop (moved from P3.7, 2026-09-29) |

---

### ✅ P1.7 — The developer can reset their own password
**Done:** 2026-09-23 · no migration · client request

**Why.** Every other account has somebody above it. The Manager is rescued by
the Owner or the developer; the Owner by the developer; a second developer by
the first. A salon with **one** developer account has nobody, and the screen
refused that account outright:

```
if (userId === dev.id) throw new UserError("Change your own password in Settings, not here.");
```

Settings is not the way out either — it asks for the current password, so it
helps only someone who already knows it. A developer with a live session and a
forgotten password could not rotate it by any means the app offered.

**What was built.** The Passwords screen now shows the form on the developer's
own row too. Two things make it safe rather than merely allowed:

| | |
|---|---|
| The session survives | `signOutEverywhere` takes a `keepToken`, so the session doing the reset is spared and every *other* device still goes. Without it the developer is signed out by their own click, holding a password they have not written down |
| The log says which happened | it is audited as **`password.self-reset`**, a different action from `password.reset` |

Left alone on purpose: **the Owner still cannot self-reset**, on the Users
screen or anywhere else. They have Settings, which asks for the current
password — a control worth keeping — and a developer above them if they are
truly stuck. `checkResetPassword` now sends each viewer to the door that will
actually open: the developer to the Passwords screen, everyone else to
Settings.

**What it does NOT fix.** You must be signed in to reach the screen at all, so
a forgotten password with no live session is still a database job. That path
is written down in `docs/HANDOFF.md` section 9.

**Verified in a browser, on the live data**, 2026-09-23: signed in as the
developer, set a new password from the own-account form, and confirmed the
session survived by re-fetching the page — **200, not a redirect to `/login`**,
which is what `requireRole` would have done to a dead session. Then set it back
through the same form, signed out, and signed in again with the original
password. Both resets appear in the dev server log as `resetPasswordAction`.

**Size:** small

---

### ✅ P1.8 — Who sets a password, reading one back, and naming the developer's account
**Done:** 2026-09-23 · no migration · three client requests in one sitting

**1. Setting somebody else's password is the developer's alone.**

The Owner could reset the Manager from Settings, and both the Owner and the
Manager from the Users screen. Both are gone: `checkResetPassword` now refuses
any viewer who is not the developer, which covers the screen and the Server
Action at once because the same function guards both. `resetManagerPassword`,
its action, its schema and `reset-manager-form.tsx` were deleted rather than
left unreachable.

**The cost, recorded because it is real:** if the Owner or the Manager forgets
their password and the developer cannot be reached, nobody in the salon can let
them back in. The client was told and chose it.

Two details worth keeping:

- The refusal does **not** name the developer — "*That password is not yours to
  set. Ask whoever maintains the system.*" The Owner and the Manager are not
  shown that the role exists (`visibleRoles`), and an error message is a poor
  place to break that. There is a test that the string never matches
  `/developer/i`.
- The login screen used to say *"Ask the Owner to set a new one."* That is now
  advice to a closed door, so it says *"ask whoever looks after the system."*

**2. An eye on every password field.**

`src/components/password-input.tsx`, on all twelve of them — the login form,
both PIN boxes, the Owner's PIN confirmation on Daily folders, and every
new-password pair. Each one was typed blind, twice, and a mistyped one is only
found at the next sign-in, by which point nobody knows which of the two boxes
was wrong.

It swaps `type="password"` for `type="text"` rather than doing anything
cleverer, so a password manager still sees an ordinary field. The toggle is a
`type="button"` (or it submits the form it sits in) with `tabIndex={-1}` (so
Tab goes to the next field, not the eye), and its `aria-label` and
`aria-pressed` follow the state.

**3. The developer can rename their own account.**

Only their own: the Owner's and the Manager's usernames are the salon's,
printed on whatever the counter staff were handed, and renaming one out from
under them is a support call rather than a feature. The session survives — a
session is bound to the account's id, not its name — but the next sign-in needs
the new one, which the screen says.

`username-rules.ts` is pure and tested: 3–32 characters, letters, digits and
`. _ -`, at least one letter or digit, trimmed before judging, and case-folded
so `Owner` and `owner` cannot become two accounts. `user.username` is unique in
the database, so the "already taken" message is a courtesy and the constraint
is the guarantee.

The screen is now **Accounts** rather than Passwords, in the nav and in its
heading, because that is what it does.

**Verified:** the eye was measured in a browser — `type` goes `password` →
`text`, the value becomes readable, `aria-label` flips to "Hide the password"
and `aria-pressed` to `true`.

**And verified by the client, not by us.** While this was being written they
signed in and used the new screen themselves. `audit_log` has it:

```
23 Sep 09:03:46  developer  password.self-reset  developer
23 Sep 09:04:13  developer  password.reset       manager
23 Sep 09:04:17  developer  password.reset       owner
```

Three things that proves at once: the self-reset works for a real person, the
session survived it (they went on to reset two more accounts in the next thirty
seconds), and `password.self-reset` is distinguishable from `password.reset` in
the log — which was the point of giving it its own name.

**Size:** medium

---

### ✅ P6.2 — The salon's real logo, everywhere
**Done:** 2026-09-23 · the client sent the artwork

Every brand mark in the app was a **scissors glyph from the icon set** — a
placeholder for a logo nobody had handed over. The client sent the real one:
"ART", a handlebar moustache, "MEN'S SALON".

**Where it now appears:** the navy sidebar, the drawer, the bar across the top
of a phone, the login screen (**above** the sentence on the navy half, which is
what the client asked for), the 404 and error screens, the browser tab, and the
**printed receipt**, which used to spell the name out in text.

**Two files, not one with a CSS filter.** The artwork arrived as dark ink on
white and has to be cream on the navy panels. `public/logo.png` keeps the
original black and brown for light surfaces and paper; `public/logo-light.png`
is the same silhouette flattened to cream.

**Cutting the white out took three steps, because a colour key is not enough
on a JPEG.** Alpha comes from the inverted luminance; a threshold curve
(6%–92%) then clears the ringing that would otherwise show as a grey box around
the mark; and the colour is un-premultiplied against white —
`C = (c − 255(1−a)) / a` — so the ink keeps its real black and brown instead of
the washed-out version it had where it met the page.

**The icon is the whole lockup, not the moustache.** Cropping to the moustache
was tried and rendered side by side: the curls reach up into the rows that hold
"ART" and down into "MEN'S SALON", so every crop that lost the words also
clipped the curls. `src/app/icon.png` (512) and `apple-icon.png` (180) are the
full mark in cream on a navy rounded square — Next's own file convention, so
`favicon.ico` was deleted rather than regenerated.

**One bug worth recording.** The sidebar rendered the logo **232 × 44** — a
ratio of 5.3 against the artwork's 1.47. A flex column stretches its children
across the cross axis by default, and `w-auto` on an image does not resist it.
Fixed at both ends: `items-start` on the lockup, and `object-contain` on the
image so the next container that tries it letterboxes rather than smears.
Measured after: 65 × 44, ratio 1.47.

**Swept up with it:** the five Next.js template SVGs in `public/` — `file`,
`globe`, `next`, `vercel`, `window` — which nothing had ever referenced.

**Size:** small

---

### ✅ P1.9 — One seed script, and it creates only the developer
**Done:** 2026-09-25 · no migration · the user's request

**Why.** Commit `5313fc3` deleted all four seed scripts (`seed-users`,
`seed-developer`, `seed-sample`, `seed-accounts`) but left their four commands in
`package.json`, so every `pnpm db:seed*` failed. With `disableSignUp: true` and
no sign-up screen, that left a fresh database with no way to get its first
account — and `docs/HANDOFF.md` 9a's plan for the trial is exactly a fresh
database.

**The user's decision:** bring back one script, for logging in only — not the
services one — and let it create the developer and nobody else. The developer
creates everyone else.

**Checked in the code before building, not assumed:**

- `creatableRoles("developer")` is `["developer", "owner", "manager"]`
  (`features/users/rules.ts`), so the Users screen covers both salon accounts.
- The Passwords screen shows `ResetPinForm` for the Owner even when "None is set
  yet", and `resetPin` only refuses a non-Owner — so the Owner's PIN, which
  `seed-users.ts` used to set, has a screen.
- `addPartner` and `addFixedLine` exist, so `seed-accounts.ts` has nothing a
  screen cannot do.

**What was done:**

- `scripts/seed-developer.ts` restored from `5313fc3~1`, header rewritten. One
  change in behaviour: it skips when **any** account with role `developer`
  exists, not only one named `developer`. P1.8 lets the developer rename their
  own account, and the old name check would then have created a second one.
- `package.json` — `db:seed`, `db:seed:sample` and `db:seed:accounts` removed.
  `db:seed:developer` is the only seed command.
- Comments that named the deleted scripts: `lib/auth/server.ts`,
  `features/users/service.ts`, `features/users/components/create-user-form.tsx`,
  `features/developer/service.ts`, `scripts/load-env.ts`.
- `README.md`, `.env.example`, `docs/PROJECT_GUIDE.md`, and
  `docs/DEPLOY_VERCEL.md` — the deploy steps now read: seed the developer,
  redeploy, sign in as the developer, create the Owner and the Manager, set the
  Owner's PIN, enter the real data.

**Not done, on purpose:** the script was **not run**, at the user's instruction.
The live database already has its developer; run against it, the script would
only print `skip`. The new first-run path (seed, then create the Owner and
Manager from the screens) has therefore **not been exercised on an empty
database** — do that on the throwaway Neon branch 9a asks for.

**Verified:** `pnpm build` (26 routes), `pnpm test` (353), `pnpm lint` all
pass, and `tsc --noEmit` covers `scripts/seed-developer.ts` and passes.

---

### ✅ P6.3 — Tidy the login page after `5313fc3`
**Done:** 2026-09-25 · no behaviour change

Commit `5313fc3` enlarged and centred the login logo. It left three things behind:

- **`w-1xl` on the logo is not a Tailwind class.** Removed. It generated no CSS —
  checked in the built stylesheets before and after — so nothing on screen moved.
  The width already follows the artwork through `w-auto`.
- The navy panel's `<div>` was indented one space short. Fixed.
- Blank lines holding trailing spaces, two in `login/page.tsx` and one in
  `BrandLockup` (`components/salon-logo.tsx`). Removed.

**Left alone, on purpose — they are design choices from that commit:** the panel
is now `items-center justify-center`, so the `<div aria-hidden />` spacer no
longer does anything and "Art Men's Salon · Karachi" sits under the sentence
instead of at the bottom of the panel. `BrandLockup` no longer shows "POS &
Accounts", so its doc comment ("the logo with what this app is underneath it")
is out of date. Ask before changing either.

**Verified in a browser** on a production build, signed out, so nothing was
written to the database: at 1440 px the logo measures **282 × 192**, ratio
1.47, the artwork's own; no horizontal overflow. At 375 px the panel is hidden
and the form shows, no overflow. No console errors. `pnpm build` (26 routes),
`pnpm test` (353), `pnpm lint` pass.

---

### ✅ P4.11 — `db:check` counts migrations against the repo
**Done:** 2026-09-25 · no migration

`pnpm db:check` printed "(16 means everything up to 0015)" — true when it was
written, wrong two migrations later, and it would have gone wrong again with
every migration after.

**What changed:** `scripts/check-db.ts` reads `drizzle/meta/_journal.json` —
drizzle-kit's own list of this checkout's migrations — and prints:

```
migrations applied 18 of 18 in this checkout (last: 0017_superb_terror)
```

When the counts differ it adds one line saying which way: **behind** ("run pnpm
db:migrate against this database") or **ahead** ("git pull before migrating" —
the other developer migrated first). The header comment no longer calls the
`.env.local` database "dev"; it is live (HANDOFF 9a). `docs/BACKUP.md` and
`docs/ARCHITECTURE.md` updated to match.

**Verified:** run against the live database (read-only) — 18 of 18. Both other
branches run for real too, from a scratch folder with a fake journal of 20
entries (**"2 behind"**) and of 16 (**"2 more than this checkout has"**); the
folder, with its temporary copy of `.env.local`, was deleted straight after.
`pnpm build` (26 routes), `pnpm test` (353), `pnpm lint` and `tsc --noEmit`
pass.

---

### ✅ P6.4 — One way to ring up a bill, and the register inside the Daily report
**Done:** 2026-09-25 · no migration · the user's request, all three parts approved

**Why.** The user found the counter screens cluttered — as if the same thing had
to be entered on several pages. Checked in the code first: nothing is *stored*
twice. A bill made on Billing appears by itself in Today's bills, the worksheet,
the Online folder and the Daily report. But three things made it look and act
that way:

1. **The worksheet's quick-add was a second way to make a bill.** Each "+ amount,
   Enter" box saved a bill with one "Quick add" line — no service, no customer,
   no receipt, any amount (spec §10.4 keeps prices to the Owner's rates). A
   counter used to the paper register could ring a sale up on Billing and type it
   into the grid as well, and the sale, the cash and the commission would all
   count twice. Bill #29 on 24 Sep is one.
2. The worksheet and the Daily report were two screens of the same day's bills.
3. Repeats: the worksheet's banner said its subtitle again; the Daily report
   showed "Cancelled 0" and "Edited 0" every day.

**What was built:**

- **Quick-add removed.** `features/worksheet/actions.ts`, `service.ts` and
  `schemas.ts` deleted; the grid is a server component with no inputs.
  Quick-add bills already made stay as they are — bills are append-only.
- **The worksheet is the Daily report's Register view.** A `List | Register`
  switch (`daily-report/components/view-switch.tsx`), kept in the URL as
  `?view=register` beside `?date=`, so the day picker keeps the view
  (`daily-report/view.ts`, 4 tests). The register now works for **any** day,
  not only the latest. The page composes both features; neither imports the
  other (ARCHITECTURE rule 5).
- The register's footer no longer repeats Grand total / Cash / Online: the
  report's cards above carry them. One line explains the Owner / Account column.
- `/worksheet` redirects to `/daily-report?view=register`; the sidebar item is
  gone. Counter section: Billing · Daily folders · Day close · Daily report ·
  Staff khata.
- "Cancelled" and "Edited" cards only when above zero, like "Discount".
- Spec §4 and §5.3 carry a dated change note; HANDOFF section 6 records the
  decision; PROJECT_GUIDE updated.

**Verified:** `pnpm build` (26 routes), `pnpm test` (**357**, was 353),
`pnpm lint`. Signed-in pages could not be opened from here — two sign-in
attempts never reached the Browser pane's tab (no `/api/auth` request) — so
the new components were rendered on **live data, read-only**, through a
throwaway route (`/p64.harness`, deleted, never committed): 24 Sep's register
has no inputs, columns Arshad 3,550 + Hamid 4,400 + Sherry 3,300 = **Rs 11,250**,
the day's Total sales, Owner / Account Rs 450; the switch links are right. At
375 px the page does not overflow and the table scrolls inside its box. **Not
seen in a browser:** the Daily report page itself with the switch in its header,
and the `/worksheet` redirect. Check both on the next signed-in session.

---

### ✅ P6.5 — A calmer Daily report
**Done:** 2026-09-25 · no migration · no behaviour change · the user's request

The user sent a screenshot: congested, make it easy to read, neat and clean.
Nothing was removed that carried information; what repeated, or said nothing,
went.

| Was | Now |
|---|---|
| The date twice in the header: the day picker and the business-day pill | The picker only — it already says "(open)" or "(closed)" |
| Six tall cards (four more on a closed day); "Rs 11,250" wrapped onto two lines, "Discount gi…" cut off | One panel, `day-summary.tsx`: Total sales, Cash, Online on one row; Expected / Counted / Short-or-Extra / Security code on a second row on a closed day; then one quiet line — "13 paid bills · 1 cancelled · Rs 650 discount, already off the total" — each count after the first only when above zero. A shortfall is red, an extra amber |
| A Customer column of "Walk-in" on nearly every row | No column. A customer's name shows under the bill number when there is one |
| A green "Paid" badge on every row | Badges only for what is unusual: Cancelled, Reversal, Edited, beside the bill number. Cancelled and reversal rows are muted; a cancelled amount is struck through |
| "Cash 400" beside "400" | "Paid by: Cash" — the amount is in its own column. A split still shows both amounts |
| A grey pill round every staff name | "Haircut · Hamid", the name muted |
| An empty Status column for a Manager | The cancel column exists only when the Owner may cancel (a closed day) |

Also: the day picker is full width on a phone, where its fixed 256 px cut
"(open)" short.

**A trap found on the way, and recorded in HANDOFF section 8:** the
`.table-stacked` phone layout lives in `@layer components`, so a cell's own
`px-3.5 py-2.5` (a utility) beat its tight card spacing on a phone. The Daily
report's cells now pad from `md` up only. Today's bills on Billing had the same
problem; fixed in P6.6.

**Verified** on live data, read-only, through a throwaway route
(`/p65.harness`, deleted, never committed), since signing in from here did not
work: 24 Sep at 1024 px — every figure on one line, no "Walk-in", no "Paid"
badge, no overflow; 23 Sep (closed) as the Owner — the closing row reads Rs
5,530 / 5,000 / **Short Rs 530** / D283-D3BF-87EB, badges on exactly the seven
cancelled, reversal and edited rows, a cancel button on the three active ones;
at 375 px the picker reads in full and a bill card's cells pad 3 px instead of
12. No console errors. `pnpm build` (26 routes), `pnpm test` (357), `pnpm lint`
pass. **Not seen:** the page inside the app shell, signed in — look at it on
the live site.

---

### ✅ P6.6 — Today's bills, as calm as the Daily report
**Done:** 2026-09-25 · no behaviour change · the user chose "like the Daily report" over "phone padding only"

Billing's Today's bills now follows P6.5's rules, so the two bill tables read
the same:

- Columns: **Bill · Services and staff · Paid by · Amount · actions**. Time,
  book number and a customer's name sit under the bill number; there is no
  Customer column of "Walk-in" and no separate Time column.
- No green "Active" badge on every row — only **Cancelled** (reason on hover)
  and **Reverses #n**. Cancelled and reversal rows are muted; a cancelled
  amount is struck through.
- **Cash and Online columns, mostly "Rs 0", became one "Paid by"** plus the
  amount. `paidBy()` moved from the Daily report into `src/lib/format.ts` (4
  tests) so both tables share it — a feature may not import another.
- Each service shows its staff member ("Haircut · Hamid"), as in the report.
- Cells pad from `md` up only (trap 8.11 fixed here too). On a phone a
  cancelled bill's empty actions strip is hidden (`max-md:empty:hidden`)
  rather than drawn as a bordered blank line.

Edit, Print and Cancel are untouched.

**Verified** on 24 Sep's live bills, read-only, through a throwaway route
(`/p66.harness`, deleted, never committed; no button was pressed): 15 rows, no
"Active", no "Walk-in", no "Rs 0"; #15 Cancelled and #16 Reverses #15 badged;
13 Print buttons for the 13 active bills. At 375 px cells pad 3 px, the
cancelled bill's actions strip is `display: none`, no overflow, no console
errors. `pnpm build` (26 routes), `pnpm test` (**361**), `pnpm lint` pass.

---

### ✅ P3.12 — "Other" on a bill: extra work at whatever the counter charges
**Done:** 2026-09-25 · **no migration** · client request

**Why.** A customer sometimes has something extra done halfway through that
the list has no service for. The client asked for an **Other** option: the
amount is not fixed — the counter types it — and a reason is optional.

**No migration was needed**, because two things were already true:
`bill_lines.service_id` is nullable (the old quick-add wrote null), and
**commission is the staff member's own rate on the line amount**
(`commission.ts`), never the service's. So an Other line with a staff member
is paid, posted to the khata and counted at Day Close exactly like any line.

**What was built:**

- `lib/accounting/pricing.ts` — `serviceId: null` is an Other line. `priceCart`
  charges the typed amount; a blank one prices as 0 so the screen keeps a live
  total while it is typed. Refused: part of a deal, negative, fractional, above
  `OTHER_MAX` (Rs 100,000 — a slipped-key guard, not a price rule). Special
  rates never apply; a discount is shared onto it like any line. The line is
  named `Other` or `Other: <description>` (`otherLineName`), and that name is
  what every receipt, report, register and khata shows.
- `billing/schemas.ts` — `serviceId` nullable, `description` optional (≤ 60,
  blank → null), and an Other line **must** have an amount ≥ 1: this is what
  stops a 0 being saved.
- `billing/service.ts` — no service query when a bill names none, and the
  `bill.create` audit entry lists the Other lines (`other: [{name, amount}]`):
  the one amount the catalog did not decide is written down.
- `cart-state.ts` — `addOther` (starts on the staff member the bill already
  shares, via `commonStaff`), `setDescription`.
- `cart-lines.tsx` / `billing-screen.tsx` — a dashed **"+ Other — extra work,
  any amount"** under the cart lines, also on an empty cart. The line has a
  "What was done? (optional)" box, the staff picker and an amount box. Save
  refuses a blank amount with "Enter the amount for Other".
- `bill-draft.ts` — re-opening a bill brings an Other line back with its
  amount and description. **This also fixed a silent loss:** a line with no
  service used to be dropped from the cart, so correcting a bill that held a
  quick-add line lost the line and its money. Its name now comes back as the
  description ("Quick add").

**Verified:** `pnpm build` (26 routes), `pnpm test` (**381**, 20 new),
`pnpm lint`. The real Billing screen was driven in a browser through a
throwaway route (`/p312.harness`, deleted, never committed), **Save never
pressed with a valid bill**, so nothing was written: Haircut + Hamid for all,
then "+ Other" → the Other line took **Hamid** by itself, no error while blank,
total Rs 300; typed 250 and "Beard shape" → **Rs 550**, "Save bill Rs 550";
cleared the amount and pressed Save → **"Enter the amount for Other"**, and the
network log shows no request left the page. At 375 px the description box,
amount box and remove button fit, no overflow, no console errors. **Not
exercised:** an actual save end to end (it would write to live), and the
printed receipt with an Other line.

---

### ✅ P3.13 — Re-opening a discounted bill takes the discount off twice
**Done:** 2026-09-25 · **no migration** · found while building P3.12 · the bug **predated** it (P3.10 × P3.11)

**The bug.** `bill_lines.amount` is stored **net** of the discount. When the
Owner re-opened a bill (P1.4), `draftLinesOf` handed a price-range line (and,
since P3.12, an Other line) back with that net amount, and the screen then took
the bill's discount off **again**. Haircut 300–500 charged 450 with Rs 50 off:
saved **400**, re-opened **350**. Worse, a range line charged at its bottom
came back *below* the range (300 − 50 = 250), so the bill could not be re-opened
at all. Fixed-price and deal lines were never affected — the catalog re-prices
them whole.

**The fix: `restoreGross` in `bill-draft.ts`**, called from `getBillForEdit`.
Nothing stored says how a discount was split, so it is worked back out, and
then **checked**:

1. the lines came to (saved total + discount) before it;
2. the fixed lines' part of that is what the catalog prices them at;
3. the rest belongs to the self-priced lines — guessed in proportion to what
   they were saved at (`allocate`);
4. the cart is priced **with** the discount and every line compared with what
   was saved. The largest-remainder split can leave a guess a rupee out between
   two lines, so one-, two- and three-rupee moves between them are tried.

Even an unchecked guess adds up to the right total, so a bill can no longer
come back cheaper; only which line holds a stray rupee could differ.

A migration storing the gross amount was considered and not taken: old bills
would still need exactly this, and it would have been one more change applied
straight to the live database (HANDOFF 9a).

`getBillForEdit`'s pre-check now prices the draft **with** the discount, so a
discount that no longer fits is caught there too.

**Verified.** 7 new tests (`pnpm test` **388**), including a round trip — ring
a bill up as the counter would, re-open it as the edit screen does — over four
mixes of range, fixed and Other lines at 43 discounts each, every line coming
back to the rupee. On live data, read-only, through a throwaway route
(`/p313.harness`, deleted, never committed), every active bill of the open day
(24 Sep) was re-opened and re-priced: **12 of 14 come back to their saved
total**, including the discounted #27 and #22. **#17 and #20 do not re-open**,
exactly as before this change: both were rung up while Haircut was a flat Rs
800, and it is 300–500 now, so the screen says to cancel and re-enter. (#17 has
no discount; `restoreGross` does not touch it.)

**Noticed here, fixed in P3.14:** re-opening priced a **deal** by today's list
prices, so #22 came back at its saved total but split 204 / 272 / 1224 instead
of 453 / 227 / 1020.

---

### ✅ P3.14 — A corrected bill keeps its deals' split
**Done:** 2026-09-25 · **no migration** · the user's request, after P3.13 · **not claimed first** — the claim commit was forgotten; recorded straight as done

**The problem.** A deal's price is split across its services by their list
prices (spec 6.3), and the split decides each karigar's commission. Re-opening
a bill for correction (P1.4) split it again by **today's** list prices, so if
one had moved since the sale, a correction saved even with nothing changed
moved commission between karigars. Bill #22 (VIP deal, Rs 300 off) was saved
453 / 227 / 1020 and re-opened 204 / 272 / 1224.

**What was built:**

- `PricingCatalog.dealSplits` (`pricing.ts`) — a kept split per deal instance.
  `priceCart` uses it only if it still names exactly the deal's services, in
  whole non-negative rupees, adding up to the deal's price; otherwise it splits
  by list price as before. A new bill never has one.
- `restoreGross` became **`restoreSaved`** (`bill-draft.ts`), returning the cart
  **and** the deals' splits. With no discount the saved shares are the split.
  With one, a deal's shares are unknowns that must add up to the deal's price —
  a group, like the self-priced lines of P3.13 — and the same guess-and-check
  now runs over all groups: split each in proportion to what was saved, price
  the cart with the discount, and move a rupee at a time within a group while
  that brings every line closer to what was saved.
- **The server never takes the split from the browser.** `editBill` passes the
  original bill's saved lines to `priceBill`, which loads their services and
  deals too and works the split out itself. So a correction cannot be used to
  shift commission. The copy on `BillDraft.dealSplits` is for the edit screen's
  display only, so what it shows is what gets saved.
- `priceBill`'s "no longer active" check now applies only to what the corrected
  bill charges, since it loads the original's services as well.

**Verified.** `pnpm test` **394** (6 new): `priceCart` with a kept split, only
for its own instance, refused when it does not add up, and discounted on top;
`restoreSaved` keeping a deal's split after a list price moved (533 / 267 /
1200 stays, instead of 240 / 320 / 1440), with and without a discount; and the
round trip now covers seven mixes — deals, two copies of a deal, ranges, fixed
and Other lines — at 43 discounts each, every line back to the rupee. On live
data, read-only (`/p314.harness`, deleted, never committed): every active bill
of the open day re-opened with **every line equal to what was saved** — **#22
now 227 / 453 / 1020** — except #17 and #20, which still cannot re-open because
Haircut went from a flat 800 to 300–500 after they were sold.

Bill **#30** (developer, 2026-09-25 06:52, "Other: Hair" 200 + Hair color 1500)
appeared on the open day during this work. It was checked read-only: the user
rang it up on the live site — the first Other line saved end to end — and it
re-opens exactly.

---

### ✅ P6.7 — Folders and Staff khata tables on a phone
**Done:** 2026-09-26 · no behaviour change · the user's request

HANDOFF trap 8.11 in the last two stacked tables: Daily folders' entries table
(`entries-table.tsx`) and the Staff khata ledger (`ledger.tsx`) padded their
cells with bare utilities, which beat `.table-stacked`'s tight card spacing on
a phone. Their cells now pad from `md` up only (`md:px-3.5 md:py-2.5`).

Two empty lines on a phone went with it:

- Folders: the badge cell of an entry with no badge, and the Cancel cell of an
  online bill or a cancelled entry, are hidden when empty
  (`max-md:empty:hidden`) — the Cancel cell had drawn a bordered blank strip.
- Khata: the two blank cells of the balance row, there only to line the figure
  up under Balance on a wide screen, are hidden on a phone.

The tables' content and wide-screen layout are unchanged. **All four
`.table-stacked` tables in the app are now clear of 8.11.**

**Verified** on live data, read-only, through a throwaway route
(`/p67.harness`, deleted, never committed; nothing pressed): at 375 px every
cell pads `3px 0`, no empty cell is drawn, no overflow, no console errors — the
online bill #27 card has no Cancel strip; at 1280 px the cells pad `10px 14px`
as before and the khata's balance row shows all four cells. There were no
cancelled folder entries on the open day to look at; they use the same rule
as bill #27's row. `pnpm build` (26 routes), `pnpm test` (394), `pnpm lint`
pass.

---

### ✅ P6.8 — Login footer back at the bottom · BrandLockup comment · dark mode removed
**Done:** 2026-09-26 · no behaviour change on a light screen · the user's three loose ends from P6.3

1. **Login footer.** `5313fc3` centred the navy panel (`justify-center`), which
   pulled "Art Men's Salon · Karachi" up under the sentence. The user wanted
   only that line back at the bottom: it is now `absolute inset-x-12
   bottom-12`, centred, while the logo and the sentence stay in the middle. The
   empty `<div aria-hidden />` that `justify-between` once needed is gone.
2. **`BrandLockup`.** Its comment still described text under the logo ("POS &
   Accounts", removed in `5313fc3`). It now says what the wrapper is for —
   `items-start` stops the flex column stretching the image — and the useless
   `gap-1` went. The wrapper itself stays: it is that fix.
3. **Dark mode, removed** — the user's choice between building it and removing
   it. The `.dark` token block (shadcn's grey defaults, never switched on) is
   gone from `globals.css`, and all **29** `dark:` utilities from the six shadcn
   primitives (`button`, `tabs`, `textarea`, `native-select`, `input`, `badge`).
   Checked token by token: apart from `dark:*`, every class in those six files
   is exactly what it was. **`@custom-variant dark` was kept, on purpose,** with
   a comment: without it Tailwind 4 reads `dark:` as the device's own dark
   setting, so the next shadcn primitive added would arrive with `dark:`
   classes that turned half a screen dark on a phone set to dark.

**Verified** on a production build, in a browser (the login page needs no
sign-in): at 1440 px the footer sits 48 px from the panel's foot, horizontally
centred to the pixel, no overflow. With the browser emulating a **dark**
device, the page's colours are identical to a light one — body
`rgb(244,245,247)`, input white, button navy — and the built CSS contains no
`.dark` rule. No console errors. `pnpm build` (26 routes), `pnpm test` (394),
`pnpm lint` pass.

---

## P6 — Design system and responsive shell

| | Item |
|---|---|
| ✅ P6.1 | **Design system + responsive shell** — done 2026-09-23. A token layer, stronger primitives, a navy sidebar, and a mobile navigation that is not a 19-item horizontal scroller. See below |

### ✅ P6.1 — Design system and responsive shell
**Done:** 2026-09-23 · no migration, no behaviour change

**Why.** The screens work and the palette is the approved one from `docs/art-saloon.html`, but
nothing underneath it is a system, and it shows. Counted on 2026-09-23, in `src/**/*.tsx`:

| | Count |
|---|---|
| `text-[12.5px]` · `[13px]` · `[13.5px]` · `[15px]` — four sizes, no scale | **222** |
| `px-[18px]` — off Tailwind's 4px grid, so nothing aligns with anything else | **130** |
| `rounded-[14px] border bg-card` — a card re-typed by hand; the `Card` primitive is unused | **49** |
| Hardcoded hex (`#fafbfc`, `#efe0c8`, `#e6c58f`, …) that no token can reach | **~77** |

Those four numbers are the whole diagnosis. Every component picked its own values, so the work of
changing anything globally is a sweep rather than an edit, and the result reads as assembled rather
than designed.

Two more, which are behaviour rather than looks:

- **`Button`'s default is `h-8` (32px).** Below the 44px touch target a counter needs, which is why
  roughly forty call sites override it with `className="h-10"`. The primitive's default being wrong
  is what creates the overrides.
- **On a phone the sidebar becomes a horizontally scrolling strip of all 19 nav items**, with the
  section titles hidden. It is the worst thing in the app on a small screen.

**Decided with the client, 2026-09-23** (they asked for the redesign):

| Question | Answer |
|---|---|
| Buttons and nav buttons | **Bigger and more visible.** Both: size, weight, colour and press feedback |
| The sidebar | **Dark navy** (`#15263d`) with a brass active state — it currently disappears against the page |
| Phone navigation | **A drawer plus a bottom bar.** Hamburger opens the full sectioned menu; the four counter screens sit in a fixed bottom bar |
| Dark mode | **Left alone.** It is half-built — the light theme is navy/brass, `.dark` is still shadcn's neutral greys, and there is no toggle. The salon works in daylight, so this is not worth the risk today. **Removed entirely in P6.8** |

**Scope.** Four layers, bottom up:

1. **Tokens** in `globals.css` — a type scale, surface and line tokens for the hardcoded hex, an
   elevation scale (the app has no shadows at all today).
2. **Primitives** — `Button`, `Input`, `NativeSelect`, `Textarea`, `Badge`, and a real section
   `Card` to absorb the 49 hand-rolled ones.
3. **The shell** — navy sidebar, mobile drawer, bottom bar, a sticky page header.
4. **The screens** — the money tables become readable on a phone instead of scrolling sideways.

**Constraint.** No behaviour changes, and no schema changes. `src/features/conventions.test.ts`
still has to pass, so shared UI goes in `src/components/`, components stay in a feature's
`components/` folder, and no feature imports another.

---

**What it came to.** Counted again after the sweep, in `src/**/*.tsx`:

| | Before | After |
|---|---|---|
| Font sizes written as `text-[12.5px]` and friends | 222 | **0** |
| `px-[18px]` | 130 | **0** |
| Cards typed out by hand | 49 | **0** — one `Panel` |
| Hex colours a token cannot reach | ~77 | **0** |
| `className="h-10"` written on a `Button` | ~36 | **0** |

`global-error.tsx` is the one file left with hex in it, and deliberately: it
replaces the root layout, so it is served with no stylesheet at all.

**The four layers, as built.**

1. **Tokens** — `src/app/globals.css` is now the only file that decides a
   colour, a size or a radius. The root cause of the 222 font sizes turned out
   to be that **`body` had no font size**, so every piece of text was opting
   out of the browser's 16px; the app is designed at 14. `body` sets it, and a
   nine-step scale (`text-2xs` … `text-3xl`) covers the rest. Card padding is
   one custom property, `--pad-card`, behind a `px-card` utility, so it can
   change with the viewport — 16px on a phone, 20px above `sm`. There is also
   an elevation scale; the app previously had **no shadows at all**, which is
   why every card read as a flat rectangle.

2. **Primitives** — `Button` defaults to 40px and `lg` is 44px, so the ~36
   height overrides could go. `Input`, `NativeSelect` and `Textarea` moved to
   40px to match, which is the first time a field and the button beside it have
   been the same height. `Badge` gained `success` / `warning` / `destructive` /
   `info` / `brass`, replacing 35 hand-written colour pairs — a badge now says
   what it *means*, and each carries a hairline border, because a pale tint
   alone was nearly invisible on a white table row.

3. **The shell** — the sidebar is navy, sticky, with a brass rail on the active
   row. Below `lg` it is not rendered at all: `MobileNav` gives a top bar, a
   drawer with the sections intact, and a bottom bar holding the four screens
   the counter lives in. Which four is data — `primary: true` in `nav-config.ts`.

4. **The tables** — `.table-stacked` turns a table into a card per row below
   `md`, taking each cell's heading from its own `data-label`. One set of
   markup, not a table plus a hand-built phone copy that drift apart. Applied
   to the four the counter uses: Today's bills, the Daily report, Daily folders
   and the Staff khata. The Owner's wider tables keep a scroll box, and three
   that had **no** scroll box at all were given one.

Also folded in: the segmented control existed three times with three different
button heights and is now one `Segmented` component; and the billing cart's
row, whose fixed columns came to 248px of a 311px card on a phone — sixty for
the service name — is two rows below `sm`, placed by grid position so the
markup order is unchanged. Measured after: **222px** for the name.

**Verified**: `pnpm build` (25 routes), `pnpm test` (345), `pnpm lint` all pass.
Visually checked at 375, 768 and 1440 CSS pixels through a throwaway harness
route — the drawer opening, the bottom bar, a table stacking, and the cart row
measured in the DOM at both widths. The harness was deleted; nothing of it is
committed.

**Not done, deliberately:** dark mode. The light theme is the approved
navy/brass palette, `.dark` is still shadcn's neutral greys, and no screen
offers a toggle, so nothing reaches it. It is a task of its own. **Removed entirely in P6.8 (2026-09-26), at the user's choice.**

**Size:** large

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
2. **A bill edited in a closed month** leaves that month's frozen report as it was — leave it, or
   recalculate it? And **may the Manager use the Customers screen?** Both are written up in
   `docs/HANDOFF.md` section 9, "Questions blocking work"; neither is urgent.
   *(Both answered 2026-09-29: recalculate — built as P1.10; Customers stays the Owner's alone.)*
3. **Cash the Owner puts into the drawer — does it offset what "reached the Owner"?** (QA-09, the QA
   audit.) The Owner account counts `owner_took` only (`db/queries/month-report.ts:80-83`): Rs 5,000
   added as change and Rs 20,000 taken shows 20,000 reached and 5,000 too little held by the business.
   The spec is silent.
4. **A salaried karigar who leaves mid-month — full, part or no salary?** (QA-11.) Month close pays only
   staff active at close (`features/month-close/queries.ts:55-57`), so a leaver gets nothing and the
   month's profit is overstated by that salary. Spec §10.8 left it to be confirmed.
5. **Will more than one device ever bill offline on the same day?** (QA-37, P7.10.) The design assumes
   one counter (spec §10.5), and nothing enforces it.
6. **Commission rounding** (QA-19): it is rounded half-up per karigar per day, so a month's commission
   can be a few rupees above the rate × the month's work (30 × 125 = 3,750 against 3,735). Fine to keep,
   but it should be the client's stated policy.

## Answered

- **Can Day Close happen offline?** Yes (2026-09-26) — the security code is computed on sync
  (P2.2f).
- **What bill number goes on an offline receipt?** A temporary `T-5` is fine (2026-09-26); the real
  number comes on sync (P2.2d).

- **Each developer has their own database** (2026-09-22). A migration or seed run by one does not
  touch the other's data. The migration conflict described in `docs/HANDOFF.md` section 8.1 still
  applies — that one is about the shared `drizzle/meta/_journal.json` file in git.
