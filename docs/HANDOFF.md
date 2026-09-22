# HANDOFF — read this first

**Purpose.** This is the working state of the project between sessions. If you are an assistant
starting a fresh session on this repo, read this file and `docs/BACKLOG.md` before anything else.
Then do the one task the user asks for.

**Language.** Everything written down — this file, the backlog, code, comments, commit messages —
is in **English**. Talk to the user in **Roman Urdu**.

**Update this file at the end of every task** — see section 11.

Last updated: 2026-09-22 (P0 complete incl. P0.4; P1.0, P2.1, P1.4, P1.5, P5.2, P1.1, P1.6, P3.8, P4.9 and P4.10 done)

---

## 1. Working agreement

Standing instructions. They override default habits.

| Rule | Detail |
|---|---|
| **One task per session** | Work through the backlog one item at a time. Do the task asked for; do not start the next one. |
| **`main` branch only** | Never create a branch. Never open a PR. All work lands on `main`. |
| **Ask before implementing** | The user says when to build. If a request is ambiguous, discuss first — do not start editing files in answer to a question. |
| **Verify every change** | After each task: `pnpm build`, `pnpm test` (197 tests), `pnpm lint`. All three must pass before reporting done. |
| **Roman Urdu in chat, English in files** | The user writes Roman Urdu. Match it in conversation. Everything committed stays English. |
| **Commit and push at the end of a task** | Required — see section 2. Two people share this branch and each pulls the other's work. |

---

## 2. Two developers share `main`

**This is the most important operational fact about the project.**

- One developer works **during the day**, the other **at night**.
- Both work directly on `main` and pull each other's work daily.
- There is no CI yet (backlog P4.7) and no PR review, so nothing catches a bad push except the
  next person.

### Rules that follow from that

| | Rule | Why |
|---|---|---|
| 1 | **`git pull --rebase` before starting anything.** | The other developer may have pushed hours ago. |
| 2 | **Claim the item first.** Put your name and date in the item's **Owner** line in `docs/BACKLOG.md`, commit and push *that alone*, then start work. | Stops both people building the same thing. |
| 3 | **Commit and push when the task is done** — never leave finished work sitting uncommitted overnight. | The other developer pulls; unpushed work is invisible to them and guarantees a conflict later. |
| 4 | **Never work two items that touch the same feature at the same time.** | e.g. P0.2 and P1.0 both touch `day-close`. Check the other person's claimed items first. |
| 5 | **Migrations: only one person at a time.** See the trap in section 8.1. | Two generated migrations collide and can corrupt migration state. |
| 6 | **Run `pnpm install` after pulling** if `pnpm-lock.yaml` changed. | Otherwise you run against stale dependencies. |
| 7 | **A push to `main` does NOT deploy.** This was believed for a long time and is **wrong** — see below. Pushing publishes nothing; somebody has to deploy by hand from the Vercel project nobody here can open. | Measured 2026-09-22. Until access is sorted, **anything merged to `main` is not live**, however green the repo looks. |

#### 7b. Pushing to `main` publishes nothing (measured 2026-09-22)

Earlier versions of this file said a push to `main` builds and deploys on Vercel by itself. It does
not. After pushing commit `b111fca`:

- the live site served the **same behaviour** nine minutes later, polled eighteen times;
- its Next.js **chunk hashes were unchanged**, so it was still the same build;
- and `api.github.com/repos/Sakib543/art-man/deployments` returns **an empty list** — nothing has
  *ever* created a GitHub deployment on this repo, which Vercel's Git integration does on every push.

So the live site is not built from pushes to this repository. Whoever owns the Vercel project is
deploying some other way — by hand, from the CLI, or from their own copy of the repo.

**What follows from it:** work that is committed and pushed is **not shipped**. Everything done on
2026-09-22 — P3.8, P4.9, P4.10 and the P0.4 lockout fix — is on `main` and **not on the live
site**. Do not tell the client a fix is live because it is pushed.

### Before you report a task finished

```bash
pnpm build && pnpm test && pnpm lint   # all three pass
git pull --rebase                       # pick up the other developer's work
pnpm build && pnpm test                 # confirm it still passes after the rebase
git push
```

That second verification matters: your change and theirs can each be fine alone and broken together.

---

## 3. What this project is

POS and bookkeeping for a single men's salon in Karachi ("Art Men's Salon"). It replaces a paper
register. Two jobs: nightly cash reconciliation, and clean monthly accounts with partner shares.

Stack: Next.js 16.3.5 (App Router, Turbopack) · React 19 · Drizzle ORM · PostgreSQL on Neon ·
Better Auth (username + password) · Tailwind 4 + shadcn/ui · Zod · Vitest.

| File | What it is |
|---|---|
| `docs/BACKLOG.md` | **The work queue.** 26 items, P0–P5, with client decisions recorded |
| `docs/Art_Salon_Dev_Spec.md` | Business rules. The contract. 325 lines |
| `docs/PROJECT_GUIDE.md` | Full walkthrough, written in Roman Urdu for the user |
| `docs/ARCHITECTURE.md` | Folder rules — **currently out of date**, see backlog P4.2 |
| `docs/art-saloon.html` | Approved visual / UX reference |
| `docs/DEPLOY_VERCEL.md` | Deploy guide — **rewritten 2026-09-22** (P5.2). Trustworthy now; follow it step by step |

> `AGENTS.md` is regenerated by `next dev`. Do not put project notes there — they will be lost.

---

## 4. Current status

**The app works.** Verified on 2026-09-22 by running it, not assumed:

| Check | Result |
|---|---|
| `pnpm install` | pass (pnpm 12.3.4 via corepack; 12.5.1 also installed globally) |
| `pnpm build` | pass — 23 routes, exit 0, **succeeds with no env vars set** |
| `pnpm lint` | clean |
| `pnpm test` | **197 passed** (26 files) |
| Database | Neon, PostgreSQL 18.6, **29 tables**, all seeds loaded, migrations through `0014` |
| Login → Billing → Overview | tested in a browser, all 200 OK |
| Developer role | signed in as all three roles in a browser on 2026-09-22 (P1.1) |
| Developer bill edit | exercised end to end on an open day and twice on a closed day (P1.6) |
| Customer's last visit | looked up in a browser as the Owner, before and after a bill and its cancellation (P3.8) |
| Staff khata | opened in a browser for two staff members after the rewrite; balances and ledgers identical to before (P4.10) |
| Login is reachable with a dead cookie | fixed and tested both ways, with a real signed-in session and with a stale one (P0.4) |

Feature completeness: spec Phases 1–3 are essentially built (billing, worksheet, folders, day
close, daily report, staff khata, overview, monthly report, monthly expenses, capital, partners,
staff & rates, settings), plus the developer role with its audit log, password, maintenance and
bill-edit screens. Phase 4 (offline, backup) has not been started.

**Deployed and the database is connected.** The site is live at **https://art-man-drab.vercel.app**.

An earlier version of this section said the live site had no tables and no accounts. **That was
wrong**, and it was written without checking. Measured from a browser on 2026-09-22:

| Probe | Result | What it proves |
|---|---|---|
| `GET /login` | 200, page renders, every asset 200 | the deployment serves |
| `POST /api/auth/sign-in/username` with a username that does not exist | **401 `INVALID_USERNAME_OR_PASSWORD`**, ~500 ms warm | Better Auth **queried the `user` table and it answered**. A missing or unreachable `DATABASE_URL` gives a 500, not a 401 |
| the same request being answered at all, rather than refused | no origin error | `BETTER_AUTH_URL` matches this domain, or the request would have failed Better Auth's origin check |

So `DATABASE_URL` and `BETTER_AUTH_SECRET` are set, and **migrations have been run against live** —
at least `0000`, which creates `user`. Someone did the work described in `DEPLOY_VERCEL.md`.

**Still unknown, and worth finding out before trusting it:**

- **Was `pnpm db:seed` run?** If not there is no `owner` or `manager` account, and every correct
  password is rejected — trap 8.8. Cheapest test: sign in as `owner`. **Do not probe this from a
  script** — repeated failures count against that account.
- **Which migration is live on?** Anywhere from `0000` to `0012`. `0013` and `0014` were written on
  2026-09-22 and certainly are not applied.

**Migrations still cannot be run against live from this machine**: there is no live connection
string here (`.env.local` points at the dev branch, `DATABASE_URL_UNPOOLED` is empty), and no way to
get one without access to the Vercel project — which, re-confirmed on 2026-09-22 **after** the
deployment completed, is still in the other developer's account. Access remains the blocker for
P5.1, but it is now the only thing missing, not the whole deployment.

---

## 5. How to run it

```bash
pnpm dev              # http://localhost:3000
pnpm build
pnpm test
pnpm lint
pnpm db:migrate
pnpm db:seed          # owner + manager accounts, prints passwords ONCE
pnpm db:seed:sample   # services, deals, staff, customers, opens the first business day
pnpm db:seed:accounts # partners + fixed expense lines
pnpm db:seed:developer # the developer account, prints its password ONCE
```

`.env.local` exists and points at a **Neon dev database** (not a local Postgres, despite earlier
discussion). Keys: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (currently empty — optional),
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

**State of the dev database as this session ended:** 22 Sep 2026 is closed, carrying one cancelled
bill (#1) and its reversal (#2), a reversed commission for Arshad, and three rows in
`day_snapshot_history` — left over from verifying P0.2 and P0.3. **23 Sep 2026 is open** with
bills #3 to #9 from verifying P2.1 and P1.4: #3 carries book number `B-2/45`, and two corrections
left #4 and #7 cancelled with their reversals (#5, #8) and their replacements (#6, #9). Day total
Rs 2,600. P1.5 then corrected #3 twice (→ #11, #13) and cancelled #9 outright, leaving the day at
**Rs 1,900** with four `bill.edit` rows in `audit_log`. Every khata balance is 0. Reopen or reseed
freely; none of it is real data.

P1.1 added nothing financial. It left a `developer` account, a `password.reset` row and one
`maintenance.on` / `maintenance.off` pair in `audit_log`, and an `app_settings` row reading `off`.

**P1.6 then changed the dev data, so the paragraph above is out of date for 23 Sep.** That day was
**closed** while verifying, and bill #13 was edited three times in place — it now reads Rs 800
Haircut (Sherry) + Rs 300 Hair wash (Arshad), paid Rs 700 cash and Rs 400 online. The day's sale
is Rs 1,900, expected cash Rs 5,530 against a hand count of Rs 5,000, and the security code is
`D283-D3BF-87EB` with `4875-8460-E6FC` and `17F1-B378-808C` before it in `day_snapshot_history`.
Khata balances are no longer 0: Arshad +30 (earned, not paid), Sherry −10 (paid Rs 10 more than
she ended up earning, which is the correct result of the edits). Three `bill.developer-edit` rows
are in `audit_log`. None of it is real data — reopen or reseed freely.

P4.9 and P4.10 added **migrations `0013` and `0014`** (indexes only), both **applied to the dev
database**. They change no data and no behaviour.

**P3.8 opened 24 Sep 2026**, so 23 Sep is closed and **24 Sep is the open day**. It holds
bill #15 for Ashfaq Bhai (Haircut Rs 1,500 by Sherry, Hair wash Rs 300 by Arshad), **cancelled**,
with its reversal #16. So Ashfaq Bhai's lookup currently reads "No visits yet" — that is the
feature working, not a fault. Kamran (`03217654321`) has never had a bill. To see the last-visit
strip filled in, ring up one bill against either number.

Local logins: `owner`, `manager` and `developer`. Passwords were printed once during seeding and
the user noted them down. `seed-users.ts` and `seed-developer.ts` both **skip accounts that
already exist**, so re-running them will not print new ones. To recover one: sign in as the
developer and use `/developer/passwords`, or as the owner and use Settings for the manager.

**The manager's dev password was changed on 2026-09-22** while verifying P1.1's reset screen — ask
the user for the new one, or reset it again.

---

## 6. Client decisions (2026-09-22)

Recorded so they are not re-litigated. Full detail in `docs/BACKLOG.md`.

| Topic | Decision |
|---|---|
| **Manager's limit** | View-only on past daily reports; cannot edit. Only the Owner can. **Already works this way** — no change needed. |
| **Staff (karigar) PIN** | **Removed from the whole project** (P1.0, done 2026-09-22). No replacement confirmation wanted. |
| **Owner PIN** | **Kept.** They were two different columns: `staff.pin_hash` (dropped), `user.pin_hash` (still there). |
| **Developer role** | A 4th role above Owner: sees everything, resets any password/PIN, manages users, maintenance mode, edits config. **Built 2026-09-22 (P1.1)**, except user management (P1.2) and editing financial rows (P1.6). |
| **Developer editing financial entries** | **Approved**, after being told it weakens the append-only guarantee and the security-code chain. **Built 2026-09-22 (P1.6)**: a bill and its lines only, never deleted, always audited. Constraints below, all of them kept. |
| **Offline** | Real offline required — 6–8 hours with no internet, then sync on reconnect. |
| **Who may change a bill** | Manager: cancel, open day only. Owner: **edit** on the open day (P1.4), cancel only on a closed day (P0.3). Developer: everything the Owner can (P1.1), plus changing a bill **in place** on any day, closed month included (P1.6). |
| **Is the developer visible?** | **No, not on the screens** (2026-09-22). No developer section in Settings; the Owner and Manager see no sign the role exists. They sign in with a username and a password, nothing more. The account is still an ordinary `user` row and **every action it takes is audited** — hidden from the screens, never from the record. |
| **Marking an edited bill** | **Yes.** The Daily report's single line carries an "Edited" badge **with a link to the previous version** (P1.5, done). |
| **Customer's last visit** | **Built 2026-09-22 (P3.8).** The phone lookup now shows what the customer had done last time. Asked and answered before building: **the last visit only** (not a list, not a history dialog), **with the staff member's name** beside each service, and **cancelled bills counted nowhere** — neither in the visit count nor as the last visit. |
| **An edited bill's number** | The receipt number **need not stay the same**. That choice let P1.5 be built without weakening the append-only guarantee. |

### Constraints on the developer edit feature

The client was told the risk and approved it. Build it so the damage is bounded:

- **Do not drop the append-only triggers.** Ordinary app code — and any bug — must still be unable
  to change a financial row.
- Give the developer path a deliberate escape hatch (e.g. the trigger checks a session-level
  setting such as `app.allow_financial_edit`, opened only inside that transaction).
- **Every edit writes `before` and `after` to `audit_log`.** A row may change, never silently.
- Recompute that day's security code and keep the previous one, so the difference is visible.
- **Every action is audited**, and the account is an ordinary row in `user` — nothing about it is
  hidden from the record. That openness is also what protects the developer if the books are ever
  questioned. The client did ask (2026-09-22) that it not be *shown on the screens*, which is a
  different thing: see the row above.

Passwords and PINs are scrypt hashes and **cannot be read back by anyone** — the developer can
reset them, not view them. Technical fact, not a policy choice.

---

## 7. Verified facts about the codebase

Measured, not guessed. Do not spend time re-deriving these.

| Fact | Evidence |
|---|---|
| **No cross-feature imports** | 0 violations of `ARCHITECTURE.md` rule 5 |
| All 5 `src/db/queries/*` files are genuinely shared | each used by 3+ features |
| **Append-only triggers are `BEFORE UPDATE OR DELETE` only** | 13 triggers, none on INSERT — so data imports and restores work fine |
| `staff` table has **no** append-only trigger | it is config, so schema changes to it are safe |
| **`priceCart()` is pure** and already runs in the browser | `billing-screen.tsx:48` — a head start for offline |
| All of `src/lib/accounting/` is pure | no React, no DB — can run client-side as-is |
| **One counter device only** | spec §10.5 — so offline sync has no multi-writer conflict |
| Backend is Server Actions, not REST | 10 `actions.ts` files, exactly 1 API route (`/api/auth`) |
| Not locked to Neon | driver is standard `pg`; "Neon" appears in `src/` only in one comment |
| `bills.book_no` is **live since P2.1** | written by billing, shown in both bill lists. It has existed since migration `0000`, so wiring it up needed no migration |
| Pages run 5–11 DB queries each | matters for the VPS move: keep server and database in the same region |
| **Only the Owner has a PIN** | `user.pin_hash`. `staff.pin_hash` was dropped in `0008_busy_lockjaw.sql` (P1.0) |
| `cash_entries.pin_confirmed` now means Owner-confirmed only | set for `owner_took` / `owner_added`, never for staff rows |
| `src/lib/pin.ts` and `src/db/pin-guard.ts` are still live | they serve the Owner PIN, including the 5-wrong-tries lock |
| `staff` rows can be deleted when nothing references them | no append-only trigger; the app still prefers deactivating |
| **`day_snapshots` can be DELETED but never UPDATED** | narrowed in `0009` for P0.2. Every other financial table is still fully append-only |
| Every superseded closing record lives in `day_snapshot_history` | fully append-only, keeps the old security code, reason and actor |
| `khata_entries.reverses_entry_id` marks a reversed line | added in `0009`; lets a second reopen skip lines already reversed |
| Only the **latest** business day can be reopened | a later day's opening cash is this day's count, and its security code is built on this one's |
| Settling a day lives in `src/db/day-settlement.ts` | `summarize`, `postEarnings`, `resettleDay`, the month/owner guards. Shared by day-close, billing and daily-report without crossing features |
| `cancelBill` lives in `src/db/bill-cancel.ts` | Billing and Daily report both call it |
| A blank book number is stored as `null`, never `""` | the billing screen always sends the input's value, so `createBillSchema` maps empty to null — otherwise "no paper bill" and "blank slip" would look the same |
| **`bill_lines` does not record which deal *instance* a line belonged to** | one bill may hold the same deal twice. `draftLinesOf` in `src/features/billing/bill-draft.ts` rebuilds instances: a deal instance always contributes exactly one line per service, so the n-th line of a service belongs to the n-th instance |
| `bill_cancellations.bill_id` is the **primary key** | a bill cannot be cancelled twice even if two requests race |
| `cancelBill` and `editBill` share `writeCancellation` | in `src/db/bill-cancel.ts`, so a cancellation can run inside a bigger transaction |
| Re-opening a bill prices it against **today's** catalog | if a service or deal changed since, `getBillForEdit` refuses and says why, rather than opening with a total of 0 |
| An edited bill's cancellation reason starts `Edited:` | that is how the daily report tells a correction from a plain cancellation |
| **The Daily report folds a correction into one row; the database keeps all three** | `foldCorrections` in `src/features/daily-report/corrections.ts`. Safe because a cancelled bill and its reversal add up to zero, so no total moves |
| `bills.supersedes_bill_id` links a correction to what it replaced | added in `0010`, an `ADD COLUMN` only — no trigger was touched |
| A corrected bill counts as **edited**, not cancelled | otherwise the "too many cancellations" alert would fire whenever the Owner fixed a typo |
| Corrections made before migration `0010` are **not** folded | their `supersedes_bill_id` is null. Two of them are in the dev database |
| Today's bills (Billing screen) does **not** fold | deliberate: it is the counter's working list. Only the Daily report folds |
| **A command-line variable beats `.env.local`** | both `drizzle.config.ts` (`process.loadEnvFile`) and the seed scripts (`tsx --env-file=.env.local`) leave a variable alone when the environment already has it. Tested. This is what makes `DATABASE_URL=... pnpm db:seed` against live actually work |
| `DATABASE_URL_UNPOOLED` is read by **migrations only** | `drizzle.config.ts`. The seed scripts go through `src/db`, which reads `DATABASE_URL` — `.env.example` used to claim otherwise and was fixed in P5.2 |
| `pnpm db:seed:sample` is **test data** | Haircut Rs 800, invented customers. Never run it on the live branch |
| A closed-day correction never rewrites counted cash | the drawer was counted by hand; only expected cash moves, and the difference shows the correction |
| **`canAccess` is the whole role hierarchy** | `src/lib/auth/roles.ts`. `developer` passes every check; everyone else is matched exactly. `requireRole` goes through it, so all 26 `requireRole("owner")` sites accepted the developer untouched |
| Three checks stay strict `=== "owner"` on purpose | the owner's PIN (`account/service.ts`), the owner-only part of Settings, and the manager-only hint on Day close. The developer has no PIN, and the client asked that Settings show nothing about the role |
| **The proxy never redirects away from `/login`** | it cannot tell a live cookie from a dead one, and doing so locked people out (P0.4, trap 8.1b). The login page decides, with `getCurrentUser()` |
| The login page's own "already signed in" redirect had **never run** before P0.4 | the proxy always intercepted first. It works — verified with a real session — but it was dead code until then, which is why it was tested rather than assumed |
| **Maintenance mode is checked in `requireUser()`** | not in a layout — layouts do not re-run on client navigation. Being in `requireUser` covers every page **and every Server Action**, and it works because all 12 `actions.ts` files call `requireUser`/`requireRole` **outside** their `try` block, so the `redirect()` is not swallowed by `failure(error)` |
| `app_settings` is a key/value table with **one** key today | `maintenance` ("on"/"off"). No row means off, so an empty table is normal. No append-only trigger — it is config |
| `readMaintenance()` is `cache()`d | one query per request even though `requireUser` asks on every page. The developer short-circuits before the query runs |
| The developer has **no PIN** | `seed-developer.ts` does not set one, and `resetPin` refuses any account whose role is not `owner` |
| `pnpm db:seed:developer` is separate from `pnpm db:seed` | the owner and manager belong to the salon; this account belongs to whoever maintains the system |
| `form-feedback.tsx` and `use-form-action.ts` live in `src/components/` | moved up out of `features/account` in P1.1 so the developer feature could use them without breaking `ARCHITECTURE.md` rule 5 |
| **The append-only triggers now have an escape hatch** | `set_config('app.allow_financial_edit', 'on', true)` — migration `0012`. `is_local = true` is the whole safety story: the setting dies with the transaction, so it cannot leak onto a pooled connection. Verified against the database, including that the same connection is refused again after the commit |
| **`src/db/financial-edit.ts` is the only place that may set it** | if a second one appears, the guarantee stops being checkable by reading one file. `denyFinancialEdit` shuts it again as soon as the rows are written, so settling the day and writing the audit entry run with it closed |
| `audit_log` and `day_snapshot_history` run `forbid_change_always()` | no setting opens them. Without this the developer could erase the evidence of using the hatch |
| **14 triggers, across four migrations** | `0001` (10, one later replaced), `0005` (2), `0007` (1), `0009` (day_snapshot_history, plus `day_snapshots` moved to `forbid_update`). Never assume `0001` is the whole list |
| A reversal bill and a cancelled bill cannot be edited in place | each is half of a mirrored pair; changing one side alone leaves the day wrong and nothing downstream checks it |
| A bill edit keeps the bill's own lines | no adding, no removing. Adding is a different bill; removing would delete a financial row, which P1.6 deliberately does not do |
| **A closed month is not recalculated after an edit** | `month_closes.report` and `shares` were frozen at close. The screen warns in red and the audit entry records `monthClosed`. Recalculating would rewrite a record the partners were paid against — a client decision, not a code one |
| **A cancelled bill used to count as a customer visit** | `customerInfo()` excluded reversals but not cancellations. Fixed in P3.8; both halves now go through one shared `realVisit()` condition, so the visit count and the last visit cannot disagree |
| The customer lookup is **4 queries**, and took 1–5 s against Neon | measured in the dev server log during P3.8. Two of them are the last visit and its lines |
| **The tables that grow are now indexed** | migration `0013` (P4.9) added 7: `bills(business_date, bill_no)`, `bills(customer_id)`, `bill_lines(bill_id)`, `cash_entries(business_date, created_at)`, `khata_entries(business_date)`, `audit_log(created_at)` and `audit_log(action, target, created_at)`. Before it, 4 indexes existed in the whole schema and 3 were Better Auth's |
| Tables that gain only a few rows a month are **deliberately unindexed** | `monthly_expenses`, `partner_drawings`, `capital_repayments`. `staff_id` is unindexed on `bills`/`bill_lines`/`cash_entries` too, because there it is only ever joined **to** `staff.id`. `khata_entries.staff_id` is the exception: P4.10 gave it a query that filters on it, so `0014` indexed it |
| **`sum()` on an integer column comes back as a string** | Postgres sums it as `bigint` and `pg` returns that as text. Drizzle needs `.mapWith(Number)` or a balance silently becomes `"30"`. Bitten in P4.10; check any future aggregate |
| Staff khata is **two queries, not the whole table** | `sum ... group by staff_id` for the list, `where staff_id = ?` for the ledger (P4.10). The `KIND_ORDER` sort and the running balance stayed in JavaScript, in `inLedgerOrder` |
| A wider index is not automatically a better one | `(staff_id, amount)` was measured against 10,000 rows and **rejected**: the balances `group by` must read every row, so Postgres preferred a sequential scan even with the index available |
| **Postgres does not index a foreign key by itself** | this is why `bill_lines.bill_id` had nothing for 12 migrations. Check it whenever a new table gets a reference |
| The planner ignores an index until the table has statistics | with 27 rows it filtered instead of using `audit_log(action, target, created_at)`; with 18,000 it chose an Index Only Scan. **Do not judge an index on the dev database's row counts** — generate rows in a transaction, `ANALYZE`, then roll back |
| A rolled-back transaction does **not** trip the append-only triggers | they are `BEFORE UPDATE OR DELETE`. So inserting throwaway rows, measuring, and rolling back is a safe way to test against a realistic table size |
| `bill_lines` has **no order column** | both the developer's edit screen and the last-visit strip order by `name`, so the two lists look alike |
| `get_page_text` reads `<main>` only | a Base UI dialog renders in a portal outside it, so a confirmation dialog looks absent when it is open. Use `read_page` or query `[role="dialog"]` instead |

---

## 8. Traps that have already cost time

**Read this before debugging anything.**

### 8.0 Undoing a close means reversing what it wrote, not clearing a flag

A close writes khata earnings, khata payments and staff-payment cash rows — all append-only. Simply
clearing `business_days.closed_at` would let the next close write them **again**, doubling every
staff member's pay in the khata and in expected cash. `reopenDay()` reverses each of them with a new
row first. `resettleDay()` does the same for a cancellation inside a closed day. Anything else
that changes a settled day must go through one of those two.

### 8.0b `pnpm build` then `pnpm dev` gives 404 on every page

Ran into this on 2026-09-22. `next build` and `next dev` (Turbopack) share the `.next` directory,
and a dev server started on top of a production build serves **404 for every route** — `/login`
included — with no error in the log. It looks exactly like broken routing, and it is not.

```bash
rm -rf .next        # then start the dev server again
```

Since the working agreement says to run `pnpm build` after every change, this will happen again.
If a route 404s in dev and the same route is listed in the build output, clear `.next` first.

### 8.1 Migration conflicts between the two developers

`pnpm db:generate` writes a new `drizzle/NNNN_*.sql` **and appends to the shared
`drizzle/meta/_journal.json` and a snapshot file**. If both developers generate a migration before
pulling, both produce number `NNNN`, both edit `_journal.json`, and the conflict is painful to
resolve — a bad merge can leave the migration state inconsistent against a live database.

Rules:
- Only generate a migration while you hold the backlog item that needs it.
- `git pull --rebase` immediately before running `pnpm db:generate`.
- Push the migration as soon as it is generated — do not sit on it.
- **Never edit an already-committed migration file.** Always add a new one.

### 8.1b A cookie is not a session — and the proxy can only see the cookie

Cost a real lockout on the live site, found 2026-09-22 (P0.4, fixed).

`src/proxy.ts` runs on the edge and deliberately does **not** touch the database: `getSessionCookie`
tells it only that a cookie exists. It used to treat that as "signed in" and redirect `/login` to
`/billing`. When the cookie was dead, `requireUser()` redirected straight back, and the two bounced
for ever — `ERR_TOO_MANY_REDIRECTS`, with the login page unreachable, so the person could not sign
in to recover.

**A cookie outliving its session is ordinary, not exotic.** Resetting a password deletes every
session that user has (`account/service.ts`, `developer/service.ts`), and re-seeding the database or
rotating `BETTER_AUTH_SECRET` invalidates everyone's at once.

The rule that follows: **the proxy may keep people out of pages, but must never push anyone away
from `/login`.** Anything shaped like "you look signed in, go elsewhere" belongs where the session
can actually be checked. `src/proxy.test.ts` guards it, including a test that walks the proxy's own
redirects and fails if a path repeats.

### 8.2 The login form used to hide every real error — FIXED 2026-09-22 (P0.1)

It showed `"Wrong username or password."` for *any* failure, including an unreachable database, so
a correct password looked like a wrong one. This hid a broken deployment and cost time twice.

Now `src/lib/auth/sign-in-error.ts` decides the message: 401/403 and Better Auth's credential codes
keep the vague wording, status 0 says the server could not be reached, 429 explains the rate limit,
and anything else says plainly that the fault is the system's and names the HTTP status. The full
error object goes to the browser console.

Kept here as history: if a login problem is ever confusing again, read the browser console and the
dev server log, not just the screen.

### 8.3 A stale `next dev` server serves stale env — and a hot reload is not enough

After changing `.env.local`, **fully stop and restart** the dev server. Next reloads the env file
(it even logs `Reload env: .env.local`) but that does **not** fix the database connection:
`src/db/index.ts` caches the `pg` pool on `globalThis` in development, so the old pool — built with
the old connection string — survives every hot reload.

Seen twice on 2026-09-22. Both times a correct password looked wrong. If the database works from a
plain `node --env-file=.env.local` script but the app still fails, this is why.

### 8.4 `.env.local` had a malformed `DATABASE_URL`

It read `postgres:postgresql://...` — the template's `postgres:` prefix was left in front of a
pasted string. Fixed, but check the shape if connections fail.

### 8.5 `sslmode` matters, in both directions

Neon needs `?sslmode=require`. A **local** Postgres must **not** have it — `pg` sets `ssl: false`
when the parameter is absent, which is what local needs.

### 8.6 Never print `.env.local` values

A masking attempt failed once and leaked the Neon password into a transcript. Check the shape
(does it match `^postgres(ql)?://...`), never echo the value.

### 8.7 A real connection string was pasted into `.env.example`, which git tracks

Found and reverted on 2026-09-22 before it was committed, so nothing reached GitHub. Secrets belong
in `.env.local` (git-ignored) only. If `git status` ever shows `.env.example` as modified, check it
before doing anything else.

### 8.8 `docs/DEPLOY_VERCEL.md` was missing steps — FIXED 2026-09-22 (P5.2)

Its "First deploy" section never said to run `db:migrate` or `db:seed` against the live branch, yet
step 4 said "sign in as owner". Setting the environment variables creates no tables and no accounts,
so there was nobody to sign in as. Very likely why the Vercel deployment never worked. It also still
told you to enter "staff with PINs", which P1.0 removed from the project.

The guide now has both steps with working commands, and says plainly that a green build proves
nothing because the build passes with no environment variables at all.

Kept here as history: **if the live site ever refuses a correct password, check that the migrations
and the seed were actually run against the live branch** before suspecting the code.

---

## 9. Open actions and questions

**Owed by the user:**
- [x] **Rotate the Neon database password** — done on 2026-09-22.
- [x] **New connection string in `.env.local`** — done on 2026-09-22. The database works again.
- [ ] **Get access to the Vercel project** — still in the other developer's account, re-confirmed
  2026-09-22. The URL is now known (`https://art-man-drab.vercel.app`) and the live database is
  connected, so what is missing is narrower than it was: the **environment variables cannot be
  read or changed**, and the **live connection string** is needed to apply `0013` and `0014`.
  **Vercel's free Hobby plan has no collaborators**, so being "added" is not possible on it — the
  realistic route is **Transfer Project** (Project Settings → General), or a paid Team. Ask them
  for the live Neon **direct connection string** as well; that alone unblocks migrations even
  before the project moves.

**Questions blocking work:**
0. **A bill edited in a closed month leaves that month's frozen report wrong.** `month_closes`
   keeps the report and the partners' shares as they were at close, and P1.6 does not recalculate
   them — the partners may already have been paid against those figures. Ask the client what they
   want: leave the frozen record alone (today's behaviour, with a red warning on screen), or
   recalculate it. Not urgent: no month has been closed yet.
1. **Who can let us into the Vercel project?** It exists and is connected to this repo, but it is
   in the other developer's account (answered 2026-09-22). Blocks P5.1 until access is granted.
2. **Can Day Close happen offline?** If there is no internet at closing time, may the manager close
   the day offline, or must they wait? Needed for P2.2 — the security code needs the full day's
   data in order.
3. **What bill number goes on an offline receipt?** Plan: a temporary number (`T-5`) that becomes
   real (`#127`) on sync. Acceptable, or must the customer's copy always carry the final number?
   Needed for P2.2.

Questions 2 and 3 are not needed until offline work starts.

**Answered:**
- **Does a Vercel project already exist?** Yes (2026-09-22) — connected to this same repo, but
  owned by the other developer's Vercel account. See the action above and section 2 rule 7.
- **Must an edited bill keep its receipt number?** No (2026-09-22). That answer chose option B for
  P1.5: fold the rows in the view only, leave the append-only guarantee alone.
- **Should the Daily report mark a bill as edited?** Yes — badge plus a link to the previous
  version (2026-09-22). Recorded in section 6.
- **Each developer has their own database** (confirmed 2026-09-22). So a migration or a seed run by
  one does not disturb the other's data. The shared-file migration conflict in section 8.1 still
  applies — that is about `drizzle/meta/_journal.json` in git, not about the databases.
- **Should the developer role be visible anywhere?** No (2026-09-22). No Settings tab, no hint of
  it for the Owner or the Manager. Recorded in section 6.
- **What may the developer edit in place?** A bill and its lines, and nothing else; never a delete
  (2026-09-22). Cash entries, khata and monthly expenses were deliberately left out.

---

## 10. Planned order of work

Detail for each item is in `docs/BACKLOG.md`.

```
STAGE 1 — before the client trial
  1. P0.1  Show the real login error                     DONE 2026-09-22
  2. P1.0  Remove the staff PIN (keep the Owner PIN)     DONE 2026-09-22
  3. P0.2  Reopen a closed day (Owner)                   DONE 2026-09-22
  4. P0.3  Cancel a bill/entry in a closed day (Owner)   DONE 2026-09-22
  5. P2.1  Paper bill-book number field                  DONE 2026-09-22
  6. P1.4  Owner edits a bill on the open day            DONE 2026-09-22
  7. P1.5  That edit leaves one line, not three          DONE 2026-09-22

STAGE 1 is complete. Next is STAGE 2 — go live (P5.2), which needs question 1 answered.

STAGE 2 — go live
  P5.2  Fix DEPLOY_VERCEL.md · Neon `live` branch · Vercel env vars
        · migrate + seed on live · test the live URL

STAGE 3 — during the client's 20-day trial
  P1.1  Developer role                                  DONE 2026-09-22
  P1.6  Developer edits a financial entry               DONE 2026-09-22
  P3.8  Customer's last visit on the billing screen     DONE 2026-09-22
  P4.9  Index the financial tables                      DONE 2026-09-22
  P4.10 Staff khata stops reading the whole table       DONE 2026-09-22
  P1.2  Users screen        P4  Cleanup + CI

STAGE 4 — after the trial
  P2.2  Offline PWA + sync (2–3 weeks)
  P3    Bonus, special rates screen, staff receipt, printing, alerts
  P5.3  Move to a VPS + carry trial data over with pg_dump
```

P1.0 was done before P0.2 because both touch `day-close`; the reopen work now lands on code with
the PIN already removed.

Offline comes after the trial because the trial's purpose is to prove the **accounting** is correct
(spec Phase 1: run in parallel with the paper register, 7 straight days with a difference of 0).
The paper bill book (P2.1) covers outages until then.

**Good items to run in parallel** (they touch different areas): P4.2 · P4.4 · P4.7.
**Do not parallelise:** P0.2 with P1.0 (both `day-close`). P1.2 is the next item in `features/developer`;
nothing else should be started in that folder at the same time.

---

## 11. How to update this file

At the end of each task, before reporting back:

1. Mark the item done in `docs/BACKLOG.md` (⬜ → ✅), clear its Owner line, and note anything learned.
2. Update **section 4** (status) if build/test counts or the deployment state changed.
3. Add to **section 7** any new fact you measured, so the next session does not re-derive it.
4. Add to **section 8** any trap that cost you time.
5. Update **section 9** if a question was answered or a new one appeared.
6. Update **section 10** if the order changed.
7. Change "Last updated" at the top.
8. Commit and push — including this file — so the other developer sees it.

Keep it factual. Record what was *verified*, and say plainly when something is only assumed.
