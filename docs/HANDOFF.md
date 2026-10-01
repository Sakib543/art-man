# HANDOFF — read this first

**Purpose.** This is the working state of the project between sessions. If you are an assistant
starting a fresh session on this repo, read this file and `docs/BACKLOG.md` before anything else.
Then do the one task the user asks for.

**Language.** Everything written down — this file, the backlog, code, comments, commit messages —
is in **English**. Talk to the user in **Roman Urdu**.

**Update this file at the end of every task** — see section 11.

Last updated: 2026-10-01 (**P7.16 done (QA-20), no code change: the README's claims were checked against the code as it stands and corrected — append-only with `TRUNCATE` refused and closing records replaced (archived) rather than undeletable; no code path but the hatch changes a financial row, though a table owner could switch a trigger off; the chain's coverage since P7.14 and not the khata; the hatch bound to the transaction's id; what the conventions test checks and what it does not (P7.18); sign-ins audited when they reach the app; the offline 12 hours by the computer's clock; the deploy gate not yet switched on; what remains. `docs/ARCHITECTURE.md` no longer says rules 3, 5 and 7 are fully tested; `CLAUDE.md` points at section 4 for test counts instead of saying 600. Re-counted: 39 routes, 19 features, 24 migrations, 34 triggers, ~36,000 lines.** Earlier: **P7.15 done (QA-42), no migration: Staff khata shows one month (`?month=`, the month select, which keeps `?staff=`): the balance brought forward — every earlier line summed in the database — the month's lines with the running balance carried on from it, and the month's closing balance. A year of one daily-wage karigar measured 1,341,784 bytes and 106–133 ms before, 61,798–169,882 bytes and 26–31 ms after. Give bonus only on the latest month; the slip offers the month shown once closed. The user's condition, that the developer can still do everything, holds: no role lost anything.** Earlier: **P7.14 done (QA-23, QA-24, QA-12), migration `0023`, applied to live before the push: `TRUNCATE` is refused on all 17 financial tables by statement triggers (`forbid_truncate`), the owner included; the developer's hatch opens only for a setting naming the transaction's own id (`pg_current_xact_id()`), so a session-level `SET` opens nothing; `business_days` only closes and reopens (`guard_business_day`: date, opening cash, `created_at` fixed, no delete) and `attendance` is never updated and deleted only while its day is open (`guard_attendance`); a role `art_man_app` (no login) may read and write rows and nothing more. Every integration test now runs the app as a login in it; switching the live site to such a login is owed by whoever holds Neon and Vercel (`DEPLOY_VERCEL.md` 0.3). The security code also covers attendance with its pay, a bill's discount, discount reason, slip number and cancellation reason, and the drawer's reason; a day sealed before is checked on what it covered then (`securityCodeBeforeP714`). Verified on a restored copy of live as that role.** Earlier: **P7.13 done (QA-08), no migration: the offline day copy (`/api/offline/day`, any signed-in role) holds only what a close needs — pay and khata for `loadDay`'s list (the active staff, and anyone switched off with work on the day), and of the pay only `DayPay` (`dayPayOf`: pay type, daily wage and commission rate where the type pays them, never the salary, which no day earns). The online Day close's `CloseStaffRow` lost its salary too; `getAllStaff` no longer reads it. The opening cash stays in the copy, trade-off written down: no offline close without it, and it is the last day's count the Daily report already shows the Manager; both Day closes keep expected cash hidden until the count. Staff khata showing the salary to the Manager is a client question (BACKLOG "Still to ask" 7). Verified over HTTP and in the browser on a local production build: an offline close from the new copy was accepted by the server.** Earlier: **P7.12 done (QA-34), no migration: sign-in has an account lock in the database — 5 `login.failed` rows for one username (as typed, case aside) in 15 minutes and it is refused, in a Better Auth `before` hook, with `login.throttled` written each time (`db/sign-in-guard.ts`, `lib/auth/sign-in-lock.ts`); a successful sign-in or a developer's password reset ends the count. Better Auth's own limiter is a flood guard at 10 sign-ins a minute per address, keyed on `CLIENT_IP_HEADER` (default `x-forwarded-for`, which Vercel overwrites; nginx: `x-real-ip`). Sign-in audit rows now carry the address. Verified over HTTP on a local production build, the audit's spoofed-header attack included.** Earlier: **P7.11 done (QA-30), no migration: the error card (`components/error-card.tsx`, `lib/load-failure.ts`) says "No internet" when the connectivity probe fails, "The system's database is not answering" when the server answers but the new `/api/health` (204 / 503, `select 1` within 5 s) says the database does not, and otherwise "This screen could not be loaded" with no word of the database or the paper book; the first two offer the offline page and the paper bill book. Verified in the browser on a throwaway local database, all three, and Try again after PostgreSQL came back.** Earlier: **P7.10 done (QA-28, QA-37), no migration: a bill book number already on a bill still in force is refused once at the counter with that bill named — code `slip-no-repeated` — and saved with "It is another slip: save anyway" (`repeatBookNo`); a bill made offline is never refused for it; the day's lists mark both bills "Same slip no.". Each browser has a tag (`thisDevice`, IndexedDB `counters`/`device`): its code goes into offline slips (`T-KXR-5`), its id with every bill, entry and close it keeps, and into their audit entries (`after.offline.device`, with `businessDate` and `clientId`). The Overview and the Daily report say when more than one computer worked offline on a day (`offlineWorkOn`, read from the audit log); a bill or entry arriving after another computer closed its day says why. Verified in the browser on a throwaway local database.** Earlier: **P7.9 done (QA-43), no migration: `pnpm test:db` runs 94 integration tests against a real PostgreSQL — the services, Server Actions, Route Handlers and triggers — each test file on its own copy of a freshly migrated template database, on a server that must be on this computer (`TEST_DATABASE_URL`; `.env.local` is never read). In the backlog's order: the Owner-cash PIN, the concurrency cases, the day lifecycle, all 46 actions against a role table, shares through month close, then triggers, the hatch, the security-code chain, the offline sync routes and the slip. Run against the code before each P7 fix, it fails on each finding. CI runs it in a `postgres:18` container; the **Deployable** job passes only when every job did, and is what Vercel's Deployment Checks should wait on — switching that on needs the Vercel project (section 9, P5.1). Until then a push still deploys whatever CI says. `pnpm test` is unchanged (752, pure).** Earlier: **P7.8 done (QA-27, QA-05), no migration: a bill's lines are hashed in a fixed order (name, amount, staff), so the database's plan can no longer change a day's code; each closed day is checked against the code it was chained on (`checkDayCodes`, `db/day-code.ts`), so a correction no longer breaks the day after it; the Owner has a **Security codes** screen (`/security-codes`) checking a month at a time; `pnpm db:reseal` seals once the days sealed the old way, only when their records are intact. Live's 23 and 24 Sep were sealed again after the push (see section 5). QA-26, a copy of the codes outside the database, is now P7.8b — until then the Owner notes each night's code on paper.** Earlier: **P7.7 done (QA-36): Next.js and eslint-config-next 16.3.5 → 16.3.7, which clears the critical `next/og` advisory. Not 16.3.8: it was four hours old, and pnpm 12 refuses a release that new unless an exclusion list is written into `pnpm-workspace.yaml` (trap 8.31). `pnpm audit`: one moderate left, esbuild inside drizzle-kit. Verified on a production build against a throwaway local database, the offline pages and service worker included. **Run `pnpm install` after pulling** — the lockfile changed.** Earlier: **P7.6 done (QA-01), no migration: `DATABASE_URL=<local> pnpm db:migrate` no longer migrates live — a `DATABASE_URL` named on the command line is used whole (`directDatabaseUrl`, `src/lib/db-target.ts`), and `pnpm db:migrate` is `scripts/migrate.ts`: it prints the target and refuses one not on this computer unless the command ends in `--live` (the seed too). **Live is migrated with `pnpm db:migrate --live`.** The new migrator writes the same `drizzle.__drizzle_migrations` rows as `drizzle-kit migrate` (compared on two fresh databases); run against live it found nothing to apply.** Earlier: **P7.5 done (QA-29, QA-14, QA-31), no migration: Day close's "Paid today" selects the pre-filled earning on focus and asks once before paying more than the khata balance plus today's earning (`checkPayouts`); expected cash below zero is refused on the screen and by `closeDay` (`drawerBelowZero`), never shown as "Extra"; Day close and Billing read money boxes strictly (`parseRupees`, text boxes with a numeric keyboard) and say so instead of cutting 1500.7 to 1500; the wizard keeps its answers in `sessionStorage` so a reload carries on. Verified in the browser on a throwaway local database.** Earlier, 2026-09-30: **P7.4 done (QA-06), no migration: partner shares are checked in one place, in whole hundredths of a percent (`checkShares`, `shareHundredths`, `hasShareDecimals`), and `partnerShares` runs the same check — before, 0.01 / 65.4 / 34.59 saved and then crashed the Partners page and Month close ("100.00000000000001%"), and 33.333 saved as 33.33. A share takes two decimals at most, at the Save and in the box. Found with it: a day with nobody on the staff list could not be closed (an empty `attendance` insert); skipped now.** Earlier: **P7.3 done (QA-04, Critical), migration `0022` applied to live before the push: Day close now saves each person's pay terms on their `attendance` row, and a correction to a closed day (`resettleDay`) is settled on that day's own list and terms (`loadSettledDay`, `settledStaff`) instead of today's staff and rates. The QA-04 scenario leaves Arshad 500 / Bilal 700 / Karim 500 / Newbie 0 (HEAD: 1,000 / 900 / 0 / 1,000). Days closed before P7.3 fall back to the pay at the time of the correction, for their own list only.** Earlier: **P7.2 done (QA-03, QA-25), migration `0021` applied to live before the push: `voids_entry_id` / `voids_id` are unique on `cash_entries`, `partner_drawings` and `monthly_expenses`, so a row is cancelled once however many requests arrive; an installment claims its contribution row and a fixed monthly amount its line `FOR UPDATE`, so neither can be over-counted by saves at once; every Owner money form (investment, installment, drawing, other expense, bonus, adjustment) sends a client id and the server saves it once (`saveOnce`, `db/save-once.ts`; `useSaveId` on the screens); a Save that throws is said on the screen instead of the error page. Verified on restored copies of live — the same code raced with and without the constraints — and in the browser with a lost answer.** Earlier: **P7.1 done (QA-02 Critical, QA-07, QA-10): cancelling "Owner took" or "Owner added" in Daily folders needs the Owner's PIN, whoever is at the screen — the dialog asks for it, `voidEntry` refuses without it. `confirmOwnerPin` (`db/pin-guard.ts`) replaces `confirmPin`: count, check and record run under a transaction-scoped advisory lock (20 wrong PINs at once → 5 checked), only an open Owner account's PIN counts, and whose PIN it was goes to the audit log as `pinOf`. No migration. Verified on throwaway local databases (HEAD's code reproduced all three first) and in the browser as the Manager — live never connected.** Earlier the same day: **An independent QA audit ran nine phases against a throwaway local PostgreSQL — live never connected, no code changed — and its 44 findings are now backlog P7.1–P7.18; P7.1–P7.9 come before the trial (section 10, STAGE 3c). Two are Critical: a Manager can cancel the Owner's PIN-confirmed cash with no PIN (P7.1), and re-settling a closed day uses today's pay rates and staff list (P7.3). Rating C+ (6/10), conditional GO for the parallel-run trial once P7.1–P7.9 are done. Section 5 corrected: `DATABASE_URL_UNPOOLED` is set, to live, so overriding `DATABASE_URL` alone still migrates and backs up live (trap 8.24). New facts in section 7, traps 8.24–8.27, four client questions in section 9. Report: https://claude.ai/artifact/4P8fNtRv9uMu4kx4y1tVrH (private).** Earlier the same day: **`README.md` rewritten as the project's public page, at the user's request for their portfolio:** overview, engineering highlights, features by screen, roles, the daily and monthly flow, integrity mechanisms, offline design, architecture and data model with Mermaid diagrams, setup, scripts, testing, deployment, docs. It names no live URL, database host or real person; the salon's own guide stays `docs/PROJECT_GUIDE.md`. Keep its numbers (tests, migrations, triggers, routes) in step when they change. Its ten screenshots (`docs/screenshots/`) come from a throwaway demo database with fictional people — never from live, which holds real customers (trap 8.23). **P1.10: a developer's change to a bill in a closed month now works that month's saved report and the partners' shares out again — only the days move (`recalculateMonthReport`), the salaries and share percentages stay as the month closed with them (`recalculateShares`); `month_closes` is updated through the hatch in the same transaction, which claims the row first; `month.recalculate` in `audit_log` holds before and after; the Owner's screens show only the new figures — the user's decision the same day, which also removed a note built first and shows a developer's account as "System" on the adjustments card; the developer's screen lists the month's P3.4 adjustments so a mistake is not counted twice. No migration. Found and fixed with it: a change to a bill on a closed month's last day reversed the month's salary lines in the khata for good, and the khata label a developer's change leaves named the developer.** Verified against a restored copy of live — nothing written to live (trap 8.20, 8.22). 2026-09-29: **P3.3: the staff salary slip — a PDF per karigar per month from Staff khata (`/api/staff-slip`, `pdf-lib` on the server): the month's totals, the days, room to sign; final once the month is closed. The client removed P3.5 and every plan to send anything on WhatsApp or SMS; the Day close summary preview went with it. Customers stay Owner-only; a developer's edit in a closed month is to recalculate it — P1.10, open. Run `pnpm install` after pulling: `pdf-lib` is new.** **P3.7 closed, the user's call: the two restores into a local copy (P2.2f, P3.4) count as spec phase 4's "restore from backup verified"; no restore into Neon; `docs/BACKUP.md` records them; a schedule moved to P5.3.** **P3.4: an adjustment for a closed month — the Owner records it from the closed month's Monthly report; it counts in the open month's profit, so in that month's partners' shares, and in the staff khata when it is about someone's pay; the closed month is never touched. Four kinds: a sale, an expense, what a staff member earned, what a staff member took. Cancelled with a row of the opposite sign while its month is open. Migration `0020` (`month_adjustments`, append-only, the 15th trigger), applied to live before the push. Found and fixed with it: a month could be closed before its last day, which would have opened the next day inside the frozen month.** **Verified against a restored copy of live — nothing but the migration written to live (trap 8.20).** **P2.2f: Day Close offline — the five steps worked out in the browser from the copy of the day plus what is still in the outbox; the close waits in the outbox behind its day's bills and entries (`heldBack`), goes to `/api/offline/close`, and the server closes the day — making the security code — only if its own expected cash matches the one the count was compared with. One close per id, kept in the `day.close` audit entry; no migration. The online close holds back while this computer has any of the day; both copies refresh the moment the day changes; a day closed here takes no more bills or entries. P2.2 is complete.** **Verified against a restored copy of live in a throwaway local PostgreSQL — nothing written to live (trap 8.20).** **P2.2e: Daily folders offline — an expense or a staff advance made with no internet waits in the outbox beside the bills and is saved once through `addEntry` (migration `0019`, `cash_entries.client_id`, applied to live before the push); a copy of the open day in the browser (`/api/offline/day`, refreshed after every save); `/offline-folders` and `/offline-register`, opened by the worker for Daily folders and the Daily report; the register draws bills still on this computer. Only P2.2f (Day Close offline) is left of P2.2.** **P2.2d: the counter bills offline — a Save with no internet goes to the outbox with a `T-` number on the slip (kept in `book_no`), `/offline-billing` opens from the service worker when Billing cannot load, 12 hours per sign-in the server confirmed, and the offline copy now holds every customer (the user's choice). No migration.** 2026-09-28: **P2.2c: the outbox and its sync — a bill that could not reach the server waits in IndexedDB and is sent by `/api/offline/sync` through `createBill`, into the day it was made on; a refused one waits in "Needs attention". No migration; nothing queues a bill until P2.2d.** **The user: no dev Neon branch before the VPS move — P2.2c–f are built against this database (section 9).** **P3.16: the customer box starts empty for the next bill — keyed on the bill's id; verified without writing a bill (trap 8.16).** **P2.2b: the catalog copy in IndexedDB, refreshed from `/api/offline/catalog`.** **P3.15: a Save that loses its answer no longer leaves the bill in doubt — `bills.client_id` (migration `0018`, on live), one bill per id, and the screen asks the server instead of falling over.** 2026-09-26: **P2.2 started: split into P2.2a–f, the client's four offline answers recorded, P2.2a — manifest, service worker, offline page and banner — done.** P6.7: Folders and Staff khata tables fixed on a phone. P6.8: login footer, BrandLockup comment, dark mode removed. 2026-09-25 — P1.9: one seed script, developer only. P6.3: login page tidied. P4.11: `db:check` counts against the journal. **P6.4: the worksheet is the Daily report's Register view, and quick-add is gone.** P6.5 and P6.6: the Daily report and Today's bills decluttered. **P3.12: an "Other" line on a bill.** **P3.13: re-opening a discounted bill no longer takes the discount off twice.** **P3.14: a corrected bill keeps its deals' split.** Before that, 2026-09-23: P0 complete; P1.0-P1.6, P2.1, P3.1, P3.2, P3.6, P3.8, P3.9, P4.1-P4.10, P5.2, **P6.1**, **P6.2**, **P1.7** and **P1.8** done. P3.7: the backup is built, a restore has never been run)

---

## 1. Working agreement

Standing instructions. They override default habits.

| Rule | Detail |
|---|---|
| **One task per session** | Work through the backlog one item at a time. Do the task asked for; do not start the next one. |
| **`main` branch only** | Never create a branch. Never open a PR. All work lands on `main`. |
| **Ask before implementing** | The user says when to build. If a request is ambiguous, discuss first — do not start editing files in answer to a question. |
| **Verify every change** | After each task: `pnpm build`, `pnpm test` (814 tests), `pnpm lint`. All three must pass before reporting done. When the change touches the database, a service, an action or a route, `pnpm test:db` too (157 tests, a local PostgreSQL — section 5); CI runs it on every push regardless. |
| **Roman Urdu in chat, English in files** | The user writes Roman Urdu. Match it in conversation. Everything committed stays English. |
| **Commit and push at the end of a task** | Required — see section 2. Two people share this branch and each pulls the other's work. |

---

## 2. Two developers, two repositories

**This is the most important operational fact about the project, and it was recorded wrongly
until 2026-09-22.** This file used to say both developers share one repository. They do not.

| | |
|---|---|
| This working copy | **`Sakib543/art-man`** — a **fork**, created 2026-09-21 |
| Upstream (the other developer's) | **`msdevs6600/art-man`** |
| What Vercel deployed from | **the upstream**, not this fork |

That is why nothing pushed from here ever went live, and why GitHub shows no deployment has ever
been created on this repository. Measured 2026-09-22: this fork was **12 commits ahead and 0 behind**
the upstream — every one of them a day's work that the client never saw.

**Being 0 behind matters:** this fork contains everything the upstream has, plus more. So pointing
the deployment at it is a strict superset and cannot lose work.

**Done, 2026-09-22:** the Vercel project was repointed at **this fork**, and verified — pushing
here now deploys. The two repositories stay separate for now; merging them was considered and
deliberately deferred.

**Consequence the client should know about:** the other developer's pushes no longer deploy. Only
this fork does.

**A rule that conflicts with this setup:** `CLAUDE.md` says never to open a pull request. That rule
assumes push access to the repository that deploys. On a fork it strands the work instead, which is
exactly what happened. It has been left as-is because the deployment is moving to this fork, but if
that changes, the rule has to change with it.

- One developer works **during the day**, the other **at night**.
- Both work on `main`, in their own repository.
- **CI runs on every push since 2026-09-22** (P4.7): lint, test and build, in
  `.github/workflows/ci.yml`; since P7.9 also the integration tests, and a **Deployable** job that passes
  only when every job did. It reports; it does not block `main`, because nothing merges through a PR.
  A red run still reaches the live site until Vercel's Deployment Checks are set to wait on Deployable
  (`docs/DEPLOY_VERCEL.md` 0.2 — needs the Vercel project, section 9).
- There is still no PR review.

### Rules that follow from that

| | Rule | Why |
|---|---|---|
| 1 | **`git pull --rebase` before starting anything.** | The other developer may have pushed hours ago. |
| 2 | **Claim the item first.** Put your name and date in the item's **Owner** line in `docs/BACKLOG.md`, commit and push *that alone*, then start work. | Stops both people building the same thing. |
| 3 | **Commit and push when the task is done** — never leave finished work sitting uncommitted overnight. | The other developer pulls; unpushed work is invisible to them and guarantees a conflict later. |
| 4 | **Never work two items that touch the same feature at the same time.** | e.g. P0.2 and P1.0 both touch `day-close`. Check the other person's claimed items first. |
| 5 | **Migrations: only one person at a time.** See the trap in section 8.1. | Two generated migrations collide and can corrupt migration state. |
| 6 | **Run `pnpm install` after pulling** if `pnpm-lock.yaml` changed. | Otherwise you run against stale dependencies. |
| 7 | **A push to `main` deploys — since 2026-09-22.** The Vercel project was repointed from the upstream to **this fork** that afternoon, so pushing here now publishes. It did **not** before; see 7b. | Verified 2026-09-22 by pushing and watching the live site change. **Apply a migration to the live branch before pushing the code that needs it** — `pnpm db:migrate --live` (P7.6). |

#### 7b. History: for a day, pushing here published nothing

Until 2026-09-22 the Vercel project was connected to the **upstream** repo, so pushes to this fork
reached nobody. It went unnoticed because the repo looked healthy. How it was caught, in case a
deployment is ever in doubt again:

- after a push, the live site served the **same behaviour** nine minutes later, polled eighteen times;
- `api.github.com/repos/Sakib543/art-man/deployments` was **empty** — Vercel's Git integration
  creates one on every push, so an empty list means it is not watching this repo.

That second check is the quick one, and it needs no access to Vercel.

**After repointing**, the same endpoint immediately showed
`env=Production ref=54085d6 by=vercel[bot]`, and the live behaviour changed within twenty seconds.

**One thing that was NOT good evidence:** the Next.js chunk hashes. They barely moved, because the
fix was in the middleware and never reaches the browser bundle. Judge a deployment by **behaviour**
and by the deployments endpoint, not by asset fingerprints.

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

Stack: Next.js 16.3.7 (App Router, Turbopack) · React 19 · Drizzle ORM · PostgreSQL on Neon ·
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
| `pnpm build` | pass — **39 routes** (2026-10-01, `/api/health` is P7.11's; `/security-codes` is P7.8's; before it `/api/staff-slip` is P3.3's; `icon.png`, `apple-icon.png` and `manifest.webmanifest` count as routes; the offline API routes are `/api/offline/catalog`, `/api/offline/sync` (P2.2c), `/api/offline/day` and `/api/offline/folders` (P2.2e), `/api/offline/close` (P2.2f); `/offline-billing` (P2.2d), `/offline-folders`, `/offline-register` (P2.2e) and `/offline-day-close` (P2.2f) are static; `/worksheet` is now only a redirect), exit 0, **succeeds with no env vars set** |
| `pnpm lint` | clean |
| `pnpm test` | **814 passed** (57 files), 2026-10-01 (P7.15) |
| `pnpm test:db` | **157 passed** (13 files, ~20 s), 2026-10-01 (P7.15) — against a throwaway local PostgreSQL 18.4, the app connected as `art_man_it_web`, a login in `art_man_app`. The two `it.fails` gaps of P7.9 are closed and pass as ordinary tests |
| Database | Neon, PostgreSQL 18.6, **31 tables** (30 plus Neon's leftover `playing_with_neon`), all seeds loaded, migrations through **`0023`** (P7.14's triggers and the `art_man_app` role, applied 2026-10-01 before the code was pushed; `pnpm db:check` reads 24 of 24. Before it P7.3's `0022` (pay terms on `attendance`), P7.2's `0021` (unique `voids…` columns, six `client_id` columns), P3.4's `0020` (`month_adjustments`), P2.2e's `cash_entries.client_id`, P3.15's `bills.client_id`, P3.10's discount columns and P3.11's `services.max_price`). P2.2f needed none |
| Backup | `pnpm db:backup` works; the file was read back and matches the database. **A restore has been run twice, into a throwaway local PostgreSQL 18.4 (2026-09-29, for P2.2f's and P3.4's testing)**: no errors, 30 tables, 14 triggers, 20 migrations, 42 and then 43 bills, and the app ran against it both times. **The user accepted these as spec phase 4's "restore verified" (2026-09-29); no restore into Neon** (P3.7, closed) |
| Login → Billing → Overview | tested in a browser, all 200 OK |
| Developer role | signed in as all three roles in a browser on 2026-09-22 (P1.1) |
| Developer bill edit | exercised end to end on an open day and twice on a closed day (P1.6); in a **closed month**, recalculating it, on a restored copy of live (P1.10, 2026-09-30) |
| Customer's last visit | looked up in a browser as the Owner, before and after a bill and its cancellation (P3.8) |
| Staff khata | opened in a browser for two staff members after the rewrite; balances and ledgers identical to before (P4.10) |
| Login is reachable with a dead cookie | fixed and tested both ways, with a real signed-in session and with a stale one (P0.4) |
| Passwords | **the client reset all three from the screen at 09:04 on 2026-09-23** and holds them; the ones handed over earlier in that session no longer work. `audit_log` has the three rows |
| Developer self-reset | exercised in a browser on the live data (P1.7, 2026-09-23): a new password set from the own-account form, the surviving session proved by a **200** on a re-fetch, then set back and signed in with again |
| Look and responsiveness | the design system and the shell were rebuilt (P6.1, 2026-09-23) and checked at **375, 768 and 1440 CSS pixels** through a throwaway harness route. The drawer, the bottom bar, a table stacking and the billing cart's row were each measured in the DOM, not eyeballed |
| Receipt printing | a bill was rung up and two older bills reprinted in a browser; the print rules were measured against the live DOM (P3.6). **Never put on actual paper** — no printer was available |
| Error and loading screens | both boundaries were made to fire in a browser, and the 404 and skeleton checked against a production build (P4.6). `global-error.tsx` has never been triggered |
| CI | the first run went **green in 56 seconds** on GitHub, commit `0f74808` (P4.7). P7.9's first run, commit `9c446bc`: **Lint, test, build 65 s · Integration tests 51 s (Ubuntu, `postgres:18`) · Deployable** — all green (run 36783218447) |
| Users screen | an account was created, signed in with, closed, refused at the login screen, re-opened and had its password reset three times, all in a browser as the Owner (P1.2) |
| **Independent QA audit** | 2026-09-30, nine phases against a throwaway local PostgreSQL only (live never connected; repo unchanged). Rating C+ (6/10); **conditional GO for the parallel-run trial once backlog P7.1–P7.9 are done**. 44 findings, now backlog P7.1–P7.18. Report: https://claude.ai/artifact/4P8fNtRv9uMu4kx4y1tVrH (private — ask Sakib543) |

Feature completeness: spec Phases 1–3 are essentially built (billing, worksheet, folders, day
close, daily report, staff khata, overview, monthly report, monthly expenses, capital, partners,
staff & rates, settings), plus the developer role with its audit log, password, maintenance and
bill-edit screens. Phase 4: the backup is built and restored — twice, into a local copy, which the user accepted (P3.7, closed 2026-09-29) — and **billing, Daily folders, the register and Day close work offline — P2.2 is complete**: P2.2a (the PWA foundation), P2.2b (the catalog copy), P2.2c (the outbox and its sync), P2.2d (billing offline: `T-` receipts, the offline page, 12 hours per sign-in), P2.2e (expenses and staff advances offline, the copy of the day, the offline Folders and Register pages) and P2.2f (Day close offline, the security code made on sync). Starting the next business day still needs the internet. **A closed month's mistake is put right with an adjustment in the open month (P3.4)**, and a month can be closed only once its last day is closed.

**Live, deploying from this repo, and working.** The site is at
**https://art-man-drab.vercel.app**, and since 2026-09-22 every push to `main` here deploys to it.
All of that day's work — P3.8, P4.9, P4.10 and the P0.4 lockout fix — **is live**, confirmed by
behaviour on the live site, not by the build going green.

**Every migration through `0015` IS applied to the live database** — because `.env.local` points at
the live database. That was discovered on 2026-09-22 and it changes how this whole section should be
read: **read section 9a first.**

An earlier version of this section said the live site had no tables and no accounts. **That was
wrong**, and it was written without checking. Measured from a browser on 2026-09-22:

| Probe | Result | What it proves |
|---|---|---|
| `GET /login` | 200, page renders, every asset 200 | the deployment serves |
| `POST /api/auth/sign-in/username` with a username that does not exist | **401 `INVALID_USERNAME_OR_PASSWORD`**, ~500 ms warm | Better Auth **queried the `user` table and it answered**. A missing or unreachable `DATABASE_URL` gives a 500, not a 401 |
| the same request being answered at all, rather than refused | no origin error | `BETTER_AUTH_URL` matches this domain, or the request would have failed Better Auth's origin check |

So `DATABASE_URL` and `BETTER_AUTH_SECRET` are set, and **migrations have been run against live** —
at least `0000`, which creates `user`. Someone did the work described in `DEPLOY_VERCEL.md`.

**Both of those questions are now answered, by section 9a.** `pnpm db:seed` was run — the database
holds three accounts (`owner`, `manager`, `developer`), which `pnpm db:check` counts. And live is on
`0015`, the latest.

**Migrations can be run against live from this machine** — in fact they cannot be run against
anything else. `pnpm db:migrate` with no environment variable set goes straight to production. That
is convenient and dangerous in equal measure; see 9a.

Vercel access is still missing and still blocks P5.1: the environment variables cannot be read or
changed from here. It is no longer what blocks migrations.

---

## 5. How to run it

```bash
pnpm dev              # http://localhost:3000
pnpm build
pnpm test
pnpm lint
pnpm db:migrate --live # live (.env.local); without --live it refuses a database not on this computer
pnpm db:seed:developer # the developer account, prints its password ONCE — the only seed (--live likewise)
pnpm db:check
pnpm db:backup
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5544/postgres pnpm test:db   # integration tests, a local server only
```

**`pnpm test:db` needs a PostgreSQL server on this computer** and creates and drops its own databases on it
(`art_man_it_*`); it refuses any other host, and never reads `.env.local`. The throwaway cluster of trap 8.20
is enough — `initdb` into the scratchpad, `pg_ctl … -o "-p 5544 -c listen_addresses=127.0.0.1" start`, then
the command above; nothing needs restoring into it. The machine's own PostgreSQL service works too, if it
trusts local connections.

**There is one seed script, and it creates only the developer** (P1.9, 2026-09-25). Commit
`5313fc3` deleted all four seed scripts and left their commands in `package.json`; P1.9 brought
back `seed-developer.ts` alone. On a fresh database the developer signs in and creates the Owner
and the Manager on the Users screen, sets the Owner's PIN on the Passwords screen, and the real
services, staff, partners and fixed lines go in from their own screens. `db:seed`,
`db:seed:sample` and `db:seed:accounts` no longer exist — the old versions are in git history
(`git show 5313fc3~1:scripts/seed-sample.ts`) if a throwaway database ever needs sample data.

`.env.local` points at **the live Neon database** — the same one the deployed site uses. It is not a
dev database, whatever its name suggests; see section 9a, and treat every command on this page as
running against production. Keys: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`. **`DATABASE_URL_UNPOOLED` is set — to live's direct string** (measured 2026-09-30 by
its length and host, never its value; this line used to say it was empty). `db:migrate` and `db:backup`
prefer it — but since P7.6 only when `DATABASE_URL` was not named on the command line: `DATABASE_URL=<local>
pnpm db:migrate` reaches the local database (trap 8.24, now fixed).

**So anything run from here writes into the salon's books.** The sample seed that made that
easiest to forget is gone (P1.9), but a browser check against `pnpm dev` still writes to live.

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

**Haircut is now priced 300 – 500** in the dev data (it was a flat Rs 800),
set while verifying P3.11 against the client's own price list. Bill #23 is the
first bill priced inside a range: one Haircut line at **450**.

**Two bills carry a discount** — #20 (Rs 300, "Regular customer") and #22
(Rs 300, "regular"), the second rung up by the user themselves while trying the
feature out. Today's bills marks both with a **Disc Rs 300** chip.

**Bill #20 is the first discounted bill** — Rs 1,100 of work with Rs 300 off,
saved while verifying P3.10, with lines of 582 and 218. It is on the open day
(24 Sep) and it is dev data like the rest.

**2026-09-23 changed the database a little; only the discount needed a migration.**
A **bonus of Rs 500** was given to Arshad while verifying P3.1, so his khata
balance is now **Rs 530** and `khata_entries` holds 31 rows. A special rate was
set for Kamran, used to price a bill on screen, and then removed again, so
`customer_special_rates` is back to its one seeded row and Kamran's name is back
to "Kamran". Four throwaway accounts (`p39check`, `p31owner`, `p31mgr`,
`p32owner`) were created for browser checks and **all deleted** — `pnpm db:check`
reads 3 accounts. `audit_log` grew: sign-in rows from P3.9, one `khata.bonus`,
two `customer.edit`, one `customer.rate-set` and one `customer.rate-remove`.
Those stay; that table is append-only and cannot be cleaned, which is the point
of it.

P4.9 and P4.10 added **migrations `0013` and `0014`** (indexes only), both **applied to the dev
database**. They change no data and no behaviour.

**P3.8 opened 24 Sep 2026**, so 23 Sep is closed and **24 Sep is the open day**. It holds
bill #15 for Ashfaq Bhai (Haircut Rs 1,500 by Sherry, Hair wash Rs 300 by Arshad), **cancelled**,
with its reversal #16. So Ashfaq Bhai's lookup currently reads "No visits yet" — that is the
feature working, not a fault. Kamran (`03217654321`) has never had a bill. To see the last-visit
strip filled in, ring up one bill against either number.

**P3.6 then added three more bills to 24 Sep** — #17 and #18 by hand while testing, and **#19**
(Walk-in, Hair wash Rs 300, Sherry) rung up to exercise the save-then-print path. All three are
active. None of it is real data.

**Bills #31–#35 (2026-09-26 and 2026-09-28), all on the open day 24 Sep.** #31 (Rs 950) and #32
(Rs 1,800) were rung up by the user on the live site; #32 is the bill whose answer was lost, which
started P3.15. #33–#35 are P3.15's three verification bills, each Rs 450 with a Rs 50 discount, for
three made-up customers `00000315001`–`003` ("Test customer P3.15 A/B/C"); #33's `created_by` and
audit actor are `p3.15-check`, a script, not a person. The customers can be deleted (no trigger);
the bills cannot.

**P1.10 (2026-09-30) wrote nothing to the live database.** It was verified against a restored copy
(trap 8.20), where September was closed and three of its bills changed; the only contact with live
was the read-only `pnpm db:backup`. Live still has khata lines labelled "Corrected: bill #13 edited by
the developer" from P1.6's check of 2026-09-22 — the label P1.10 stopped writing; they cannot be
changed, and go with the sample data at go-live.

**P7.8 (2026-10-01) sealed live's 23 and 24 Sep again** with `pnpm db:reseal --live --apply`, after the code
was deployed: 23 Sep D283-D3BF-87EB → 7D1D-D998-FEA6, 24 Sep 24E9-35C1-45A8 → 3997-DB66-0314 (22 Sep matched
and was not touched). Both still gave their old codes the old way, so their records were intact; the old
codes are in `day_snapshot_history` and two `day.reseal` rows are in `audit_log`. A second run: "every closed
day matches its records". It was rehearsed first on a restored copy, with the same result.

**P7.14 (2026-10-01) wrote only migration `0023` to the live database** — functions, triggers, the `art_man_app` role and its grants; no row changed. Rehearsed first on a restored copy of live (trap 8.20), migrated there and driven as a login in `art_man_app`: the three sealed days checked out before and after, a developer's edit went through the hatch, 25 Sep was closed, reopened and closed again, and `TRUNCATE`, disabling a trigger, an audit-row delete, a moved opening cash, an edited staff list and a session-level `SET 'on'` were all refused. The site still connects as the owner until `DEPLOY_VERCEL.md` 0.3 is done.

**P7.3 (2026-09-30) wrote only migration `0022` to the live database** — four nullable columns on `attendance` and a check. Live's closed days (22–25 Sep, sample data) have no saved terms and fall back (section 7). Verified on throwaway local databases.

**P7.2 (2026-09-30) wrote only migration `0021` to the live database** — nullable columns and unique constraints; live had no duplicate reversal to stop it (checked on a restored copy first). Its races and screens were verified on restored copies (trap 8.20).

**P3.4 (2026-09-29) wrote only migration `0020` to the live database** — an empty table, its enum and its trigger. Everything else was verified against a restored copy (trap 8.20), where September and October were closed; no month is closed on live.

**P2.2f (2026-09-29) wrote nothing to the live database.** It was verified against a restored copy
of it in a throwaway local cluster (trap 8.20), where four days were closed; the live one still has
**24 Sep open**, 42 bills. Its only contact with live was the read-only `pnpm db:backup`.

**P2.2e (2026-09-29) left four folder rows on 24 Sep that add up to nothing:** two Rs 10 expenses,
"P2.2e test (answer lost)" and "P2.2e test (offline)", each with its cancellation. The open day
now has 42 bills in all; #41 and #42 (`T-1`, `T-2`) were made from another browser before P2.2e
started — see the P2.2e backlog entry.

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
| **Discount at the counter** | **Reversed on 2026-09-23.** Spec §10.4 and the 2026-09-22 Q&A both say the Manager may not give discretionary discounts. The client asked for an open discount field usable by **the Manager or the Owner**, was told it contradicts the spec, and kept the request. Built as P3.10. Two decisions taken with it: **commission is charged on the discounted amount** (spec §10.1 — the karigar shares the discount), and the field is **whole rupees on the whole bill**, not a percentage and not per line. A reason is required, which is the control that replaces the rule. |
| **A service may have a price range** | **2026-09-23.** The salon's printed list gives most services a range — "300 - 500" — and what is charged depends on what was done, so the counter chooses inside it when the bill is made (P3.11). The range is the Owner's decision, which is what keeps spec §10.4 intact; a customer's special rate still beats it. |
| **Staff receipt and the cancellation alert** | **Decided 2026-09-29.** The staff receipt is **a PDF slip to download** from Staff khata — the karigar's proof, sent nowhere (P3.3, built). **P3.5 is removed**, and with it every plan to send anything on WhatsApp or SMS: the Day close "WhatsApp summary" preview is gone too. The notes on screen for 3+ cancellations (Overview, Daily report) stay. (On 2026-09-23 both had been dropped for now.) |
| **Who may edit a customer (2026-09-29)** | **The Owner alone** — the Manager may not fix a name or a number either. No change: the Customers screen is already Owner-only (P3.2). |
| **A developer's edit in a closed month (2026-09-29)** | **Recalculate** the month's saved report and the partners' shares. **Built 2026-09-30 (P1.10)**, with the choices left to Claude: only the days move; the salaries and the share percentages stay as the month closed with them; the Owner sees only the new figures — no note (the user, 2026-09-30); the developer's screen lists the month's adjustments, because a mistake one of them put right must not be changed in the bill as well. |
| **Staff (karigar) PIN** | **Removed from the whole project** (P1.0, done 2026-09-22). No replacement confirmation wanted. |
| **Owner PIN** | **Kept.** They were two different columns: `staff.pin_hash` (dropped), `user.pin_hash` (still there). |
| **Developer role** | A 4th role above Owner: sees everything, resets any password/PIN, manages users, maintenance mode, edits config. **Built 2026-09-22 (P1.1)**, except user management (P1.2) and editing financial rows (P1.6). |
| **Developer editing financial entries** | **Approved**, after being told it weakens the append-only guarantee and the security-code chain. **Built 2026-09-22 (P1.6)**: a bill and its lines only, never deleted, always audited. Constraints below, all of them kept. |
| **Offline** | Real offline required — 6–8 hours with no internet, then sync on reconnect. |
| **A Save whose answer is lost (2026-09-26)** | Found live: bill #32 was saved, the answer never came back, and the screen could not say which. The client chose **the proper fix** (P3.15): an id per bill, the server saves an id once, the screen asks "did it arrive?" — not a guess from amount and time. Done **before** P2.2b, at the user's request. |
| **Offline details (2026-09-26)** | **Day Close may happen offline** (security code computed on sync). **An offline receipt carries a temporary number (`T-5`)**; the real `bill_no` comes on sync — a reserved block of real numbers was offered and declined. **No Owner PIN offline**: Owner cash entries are simply unavailable. **An offline sign-in lasts 12 hours** from the last one the server confirmed, across browser restarts and reloads. |
| **Offline billing (2026-09-29, P2.2d)** | Recommendations put to the user, who took them all: the `T-` number is **stored in `bills.book_no`** (no migration; shown as "Offline T-5"), and **restarts at T-1 each business day**; a Save whose answer is lost gets a **"Keep it for later and carry on"** button that sends it to the outbox. And the user's own choice, against the P2.2b default: **the offline copy holds every customer** (names, numbers, special rates), so offline billing knows everyone — see section 9, question 4. |
| **Offline Day Close (2026-09-29, P2.2f)** | The user said to start and left the choices to Claude; the recommended ones were taken. **The close waits in the outbox behind its day's bills and entries**, and a refused one of them keeps it waiting. **The server closes the day only if its expected cash equals the one the count was compared with** — otherwise it refuses, and the day is closed again on the full screen, starting from what was entered offline. The offline close counts everything of the day still on this computer, refused bills included (their money is in the drawer). **A day closed here takes no more bills or entries** until the close reaches the server. **No undo on the device, and no next day offline**: the Owner reopens once it has arrived, and the next day is started with the internet (paper bill book until then). A refused close: close again, or Remove with a reason |
| **Restore verified without Neon (2026-09-29, P3.7)** | Offered a restore into a throwaway Neon branch (needs the Neon account: a `neonctl` sign-in, or a branch made by hand), the user said **"rehne dein"**: the two local restores are enough. P3.7 is closed on them; a scheduled backup moves to P5.3 |
| **An adjustment for a closed month (2026-09-29, P3.4)** | The user said to start and left the choices to Claude; the recommended ones were taken. **It counts in the open month** (the latest business day's), never in the closed one, whose report and shares stay as closed. **Four kinds**: a sale (cash or online), an expense (the business or the Owner paid), what a staff member earned (profit and khata), what a staff member took (khata only). **More or less than recorded**, no default. **The Owner**, from the closed month's Monthly report. **No cash moves**: a refund or a payment now goes through Daily folders. **Cancel** with a row of the opposite sign while its month is open. Owner cash, partner drawings and capital repayments have no kind. **With it: a month is closed only once its last day is closed** |
| **A correction to a closed day (2026-09-30, P7.3)** | Left to Claude by the user ("P7.3 shuru karo"). **Settled on that day's own staff list and pay**, saved at close — spec §6.5, a rate change applies forward only. A reopened day closed again is an ordinary close, on the pay then. Days closed before P7.3 fall back to the pay at the time of the correction (no backfill: live's are sample data) |
| **Who may change a bill** | Manager: cancel, open day only. Owner: **edit** on the open day (P1.4), cancel only on a closed day (P0.3). Developer: everything the Owner can (P1.1), plus changing a bill **in place** on any day, closed month included (P1.6). |
| **Is the developer visible?** | **No, not on the screens** (2026-09-22). No developer section in Settings; the Owner and Manager see no sign the role exists. They sign in with a username and a password, nothing more. The account is still an ordinary `user` row and **every action it takes is audited** — hidden from the screens, never from the record. (P1.10 found one leak and closed it: the khata label a developer's bill change left read "edited by the developer".) **The user, 2026-09-30: the Owner must not be able to tell from any screen** — so no note when a closed month is recalculated, and a developer's account is shown as **"System"** where a screen names who recorded something (the adjustments card). Never as the Owner or the Manager: a money entry must not carry the name of someone who did not make it. What stays, and was said: the khata's correction lines, the day's security code changing (a condition of the client's approval of the edit, below), and the audit log, which nothing can erase. |
| **Marking an edited bill** | **Yes.** The Daily report's single line carries an "Edited" badge **with a link to the previous version** (P1.5, done). |
| **Who may set a password** | **The developer alone (2026-09-23).** The Owner could reset the Manager from Settings and both from the Users screen; both are gone (P1.8). The client was told the cost and chose it: if the Owner or the Manager forgets their password and the developer cannot be reached, **nobody in the salon can let them back in** |
| **The developer's own account** | **Theirs to name and theirs to unlock (2026-09-23).** They may reset their own password (P1.7) and change their own username (P1.8) — neither of which any other role may do. Nobody stands above that account, so nobody else can rescue it |
| **Customer's last visit** | **Built 2026-09-22 (P3.8).** The phone lookup now shows what the customer had done last time. Asked and answered before building: **the last visit only** (not a list, not a history dialog), **with the staff member's name** beside each service, and **cancelled bills counted nowhere** — neither in the visit count nor as the last visit. |
| **An edited bill's number** | The receipt number **need not stay the same**. That choice let P1.5 be built without weakening the append-only guarantee. |
| **Extra work not on the list** | **An "Other" line (2026-09-25, P3.12).** The counter types the amount; a description is optional (the client's words: "payment fixed na ho, bs reason ho, wo b optional"). A staff member is chosen like any line. It is the one amount no Owner-set rate decides, so it is named "Other" everywhere and listed in the bill's audit entry. |
| **The offline day copy (2026-10-01, P7.13)** | Left to Claude ("P7.13 shuru karo"). **Only what a close needs**, the same as the online Day close gives the same person: the day's pay (no salary) and the khata balance of the staff the close lists. **The opening cash stays**, the trade-off written down as the audit allowed: no offline close without it, and the Daily report already shows it to the Manager as the last day's count; the honest count is kept on the screen, which shows expected cash only after the count, offline as online. Whether the Manager may *see* pay terms at all — Staff khata shows the salary — is put to the client (BACKLOG "Still to ask" 7) |
| **Database hardening (2026-10-01, P7.14)** | Left to Claude ("P7.14 shuru karo"). All of the backlog's fix was built, with three choices: the hatch is bound to **the transaction's id** rather than to a database role (a role the app can use, any connection with the app's password could use too; an id cannot be carried to another transaction); the app's role is **made by the migration and switched to later** — the switch is a new password in Vercel, which needs its project (`DEPLOY_VERCEL.md` 0.3); and days sealed before keep their codes, **checked on what they covered then**, instead of being sealed again on live |
| **Offline slip numbers, repeated slips, a second computer (2026-10-01, P7.10)** | Left to Claude ("P7.10 shuru karo"). A `T-` number carries the computer's three-letter code (`T-KXR-5`). A slip number already on a bill in force is **asked about once**, not refused — a new paper book can start again at 1 — and never for a bill made offline. A second computer working offline is **told to the Owner** (Overview, Daily report), never refused: enforcing one device would need registering computers and could stop the counter mid-outage |
| **Where a bill is made** | **On Billing, and nowhere else (2026-09-25, P6.4).** The worksheet's quick-add was removed: it saved a bill with no service, customer or receipt at any amount typed, and invited entering the same sale twice. The worksheet itself is now the Daily report's read-only **Register** view, for any day; `/worksheet` redirects there. |

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
| **No trigger fires on INSERT** | the row triggers are `BEFORE UPDATE OR DELETE`, the rest `BEFORE TRUNCATE` — so data imports and restores work fine |
| `staff` table has **no** append-only trigger | it is config, so schema changes to it are safe |
| **`priceCart()` is pure** and already runs in the browser | `billing-screen.tsx:48` — a head start for offline |
| All of `src/lib/accounting/` is pure | no React, no DB — can run client-side as-is |
| **One counter device only** | spec §10.5 — so offline sync has no multi-writer conflict |
| Backend is Server Actions, plus 8 Route Handlers | 15 `actions.ts` files. The Route Handlers: `/api/auth`, the five offline ones (P2.2), `/api/staff-slip` (P3.3) and `/api/health` (P7.11) |
| Not locked to Neon | driver is standard `pg`; "Neon" appears in `src/` only in one comment |
| `bills.book_no` is **live since P2.1** | written by billing, shown in both bill lists. It has existed since migration `0000`, so wiring it up needed no migration |
| Pages run 5–11 DB queries each | matters for the VPS move: keep server and database in the same region |
| **Only the Owner has a PIN** | `user.pin_hash`. `staff.pin_hash` was dropped in `0008_busy_lockjaw.sql` (P1.0) |
| `cash_entries.pin_confirmed` now means Owner-confirmed only | set for `owner_took` / `owner_added`, never for staff rows — and, since P7.1, on the cancellation of either. `computeDayCode` does not hash the column, so setting it moves no security code |
| `src/lib/pin.ts` and `src/db/pin-guard.ts` are still live | they serve the Owner PIN, including the 5-wrong-tries lock. Since P7.1 the one entry point is `confirmOwnerPin(actor, pin)`, which answers whose PIN it was |
| `staff` rows can be deleted when nothing references them | no append-only trigger; the app still prefers deactivating |
| **`day_snapshots` can be DELETED but never UPDATED** | narrowed in `0009` for P0.2. Every other financial table is still fully append-only |
| Every superseded closing record lives in `day_snapshot_history` | fully append-only, keeps the old security code, reason and actor |
| `khata_entries.reverses_entry_id` marks a reversed line | added in `0009`; lets a second reopen skip lines already reversed |
| Only the **latest** business day can be reopened | a later day's opening cash is this day's count, and its security code is built on this one's |
| Settling a day lives in `src/db/day-settlement.ts` | `summarize`, `postEarnings`, `resettleDay`, the month/owner guards. Shared by day-close, billing and daily-report without crossing features |
| **`parseRupees` is how a typed amount is read** (P7.5) | `lib/format.ts`: whole rupees ≥ 0, blank = 0, anything else null — for the screen to say, never to guess. Day close (payments, count) and Billing (discount, split cash/online) use it, on `type="text" inputMode="numeric"` boxes: a number box reports "" for half-typed values like "1500." and moves on the scroll wheel |
| **Expected cash below zero cannot be closed** (P7.5) | `drawerBelowZero` (`features/day-close/offline-close.ts`) is the message; `closeProblem` (screen, offline included) and `closeDay` (server) both refuse. `syncCloseSchema` still accepts a negative `expected` — an offline close made before P7.5 is refused by `closeDay` with this message and waits in Needs attention |
| **The Day close wizard is drawn after hydration** (P7.5) | `CloseWizard` reads its kept answers with `useSyncExternalStore(noSubscription, read, () => undefined)` and renders nothing until they are read, then mounts `Wizard` with them as initial state. This is how to restore browser-only state without a hydration mismatch or `setState` in an effect (which `react-hooks/set-state-in-effect` fails) |
| **A day's code covers each bill's lines in a fixed order** (P7.8, QA-27) | `computeSecurityCode` sorts them by name, amount, staff id (code-unit comparison). Before, they went in as `bill_lines` came back — no ORDER BY — and a plan change or a line rewritten unchanged gave a different code. `securityCodeAsBefore` is the old rule, kept only for `resealOldDays` |
| **A closed day is checked against the code it was chained on** (P7.8, QA-05) | `checkDayCodes(from, to)` (`db/day-code.ts`): the previous day's code *as it stood when this day was sealed* — its current `day_snapshots` row (`created_at` → now) or a `day_snapshot_history` row (`closed_at` → `reopened_at`) — chosen in SQL, to the microsecond. Drizzle hands a raw query's timestamps back as text; `resealOldDays` writes `closed_at` from that text with `::timestamptz` so nothing is lost |
| **The Security codes screen** (P7.8) | `/security-codes`, Owner only, in the Owner nav: a month's closed days (`getMonthChoices`), code, Matches / Does not match, `checkSummary`. Three queries for the records of the whole month plus one for the snapshots |
| **`pnpm db:reseal`** (P7.8) | `scripts/reseal-days.ts` → `resealOldDays`: dry run by default (the work is done in a transaction and thrown away), `--apply` writes, `--live` for a database not on this computer. It seals again only a day that fails the new check *and* still gives its code the old way; a day whose records changed is listed and left. Old code → `day_snapshot_history` ("Sealed again: … (P7.8)"), `day.reseal` in `audit_log`, actor `p7.8-reseal`. A database begun after P7.8 has nothing for it |
| **Partner shares are whole hundredths of a percent** (P7.4) | `shareHundredths` (33.33% → 3,333); `checkShares` wants exactly 10,000, none negative, at most two decimals each (`hasShareDecimals` — `partners.share_pct` is numeric(5,2)). `partnerShares` runs `checkShares` and allocates by the hundredths. Never compare summed float percentages: 0.01 + 65.4 + 34.59 is 100.00000000000001 |
| **An insert of no rows throws in Drizzle** | "values() must be called with at least one value". `closeDay` skips the `attendance` insert with nobody on the staff list (found in P7.4); guard any other insert built from a list that can be empty |
| **`attendance` is the day's staff list with its pay** (P7.3, `0022`) | One row per person on the list at close, present or not, with `pay_type`, `salary`, `daily_wage`, `commission_rate` copied from `staff`. Deleted at a reopen, written again at the next close. Null terms = a day closed before P7.3. Since P7.14 (`guard_attendance`) never updated, and deleted only while its day's `closed_at` is null — which is why `reopenDay` clears it first — and covered by the security code |
| **`business_days` only closes and reopens** (P7.14, `guard_business_day`) | Any change but to `closed_at` is refused (compared as `to_jsonb(row) - 'closed_at'`, so a column added later is covered too), a closed day's `closed_at` cannot be moved to another time, and no day is deleted. The hatch does not open it |
| **`resettleDay` reads `loadSettledDay`, never `loadDay`** | `db/queries/day-data.ts`. `loadDay` is today's staff (active, or with work on the day) on today's pay — right for the day being closed, wrong for a closed one: before P7.3 a correction paid a raise backwards, paid a wage to someone who joined later (anyone with no attendance row counted as present), and reversed a leaver's wage for good. `settledStaff` (`lib/accounting/day-close.ts`) decides: the saved list on the saved pay; a saved row with no terms → the pay now; work on the day by someone not on the list → the pay now, not present |
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
| **A command-line variable beats `.env.local`** | `scripts/load-env.ts` reads the file with `process.loadEnvFile`, which leaves a variable alone when the environment already has it; `drizzle.config.ts` imports the same file. Tested. It also records `outside` — what the environment set before the file — for `directDatabaseUrl` |
| **`DATABASE_URL_UNPOOLED` is read by migrations and backups, and only when `DATABASE_URL` was not named on the command line** (P7.6) | `directDatabaseUrl` (`src/lib/db-target.ts`), from `scripts/migrate.ts`, `scripts/backup.ts` and `drizzle.config.ts`. The seed script goes through `src/db`, which reads `DATABASE_URL` |
| **`pnpm db:migrate` is `scripts/migrate.ts`, not drizzle-kit** (P7.6) | It prints the target, refuses a non-local one without `--live` before connecting (`writeTarget`, `scripts/target.ts`), and runs `migrate` from `drizzle-orm/node-postgres/migrator` on one `pg` Client. Compared with `drizzle-kit migrate` on two fresh databases: identical `drizzle.__drizzle_migrations` rows and schema. `db:generate` and `db:studio` still go through drizzle-kit and `drizzle.config.ts` |
| A closed-day correction never rewrites counted cash | the drawer was counted by hand; only expected cash moves, and the difference shows the correction |
| **`canAccess` is the whole role hierarchy** | `src/lib/auth/roles.ts`. `developer` passes every check; everyone else is matched exactly. `requireRole` goes through it, so all 26 `requireRole("owner")` sites accepted the developer untouched |
| Three checks stay strict `=== "owner"` on purpose | the owner's PIN (`account/service.ts`), the owner-only part of Settings, and the manager-only hint on Day close. The developer has no PIN, and the client asked that Settings show nothing about the role |
| **The proxy never redirects away from `/login`** | it cannot tell a live cookie from a dead one, and doing so locked people out (P0.4, trap 8.1b). The login page decides, with `getCurrentUser()` |
| The login page's own "already signed in" redirect had **never run** before P0.4 | the proxy always intercepted first. It works — verified with a real session — but it was dead code until then, which is why it was tested rather than assumed |
| **Maintenance mode is checked in `requireUser()`** | not in a layout — layouts do not re-run on client navigation. Being in `requireUser` covers every page **and every Server Action**, and it works because all 12 `actions.ts` files call `requireUser`/`requireRole` **outside** their `try` block, so the `redirect()` is not swallowed by `failure(error)` |
| `app_settings` is a key/value table with **one** key today | `maintenance` ("on"/"off"). No row means off, so an empty table is normal. No append-only trigger — it is config |
| `readMaintenance()` is `cache()`d | one query per request even though `requireUser` asks on every page. The developer short-circuits before the query runs |
| The developer has **no PIN** | `seed-developer.ts` does not set one, and `resetPin` refuses any account whose role is not `owner` |
| `pnpm db:seed:developer` is the **only** seed (P1.9) | sign-up is disabled, so something has to make the first account; the developer can create every role (`creatableRoles`) and set the Owner's PIN, so nothing else needs a script. It skips when **any** `developer`-role account exists, not only one named `developer` — the account can be renamed (P1.8) |
| `form-feedback.tsx` and `use-form-action.ts` live in `src/components/` | moved up out of `features/account` in P1.1 so the developer feature could use them without breaking `ARCHITECTURE.md` rule 5 |
| **The append-only triggers have an escape hatch, opened by a transaction's own id** | `set_config('app.allow_financial_edit', pg_current_xact_id()::text, true)` — migration `0012`, and since P7.14 (`0023`, QA-24) `forbid_change()` opens only when the setting equals `pg_current_xact_id()::text`. A session-level `SET … = 'on'` used to open every financial table for the rest of the connection; now neither `'on'` nor an ended transaction's id opens anything, and `is_local = true` still resets it at commit or rollback |
| **`src/db/financial-edit.ts` is the only place that may set it** | if a second one appears, the guarantee stops being checkable by reading one file — and since P7.14 `features/conventions.test.ts` fails on any other file in `src/` or `scripts/` that names the setting. `denyFinancialEdit` shuts it again as soon as the rows are written, so settling the day and writing the audit entry run with it closed. Since P1.10 the developer's edit opens it a second time in a closed month, for the one `update month_closes`, and shuts it straight after |
| `audit_log` and `day_snapshot_history` run `forbid_change_always()` | no setting opens them. Without this the developer could erase the evidence of using the hatch |
| **34 triggers since P7.14** | 15 append-only across five migrations — `0001` (10, one later replaced), `0005` (2), `0007` (1), `0009` (day_snapshot_history, plus `day_snapshots` moved to `forbid_update`), `0020` (`month_adjustments`, P3.4) — and in `0023` the two day guards and 17 `BEFORE TRUNCATE … FOR EACH STATEMENT` triggers (`forbid_truncate`) on all of those tables plus `business_days` and `attendance`. A `TRUNCATE … CASCADE` from `staff` or `customers` reaches them and is refused too. Never assume `0001` is the whole list |
| **The app's role, `art_man_app`** (P7.14, `0023`) | No login; `SELECT, INSERT, UPDATE, DELETE` on every table in `public` (and on later ones, by default privileges), sequences' `USAGE, SELECT`; no `TRUNCATE`; no `UPDATE`/`DELETE` on `audit_log` and `day_snapshot_history`; owns nothing, so cannot `ALTER`, `DISABLE TRIGGER` or `DROP`. Roles belong to the whole server, so `0023` makes it only if missing, and skips with a notice where the migrating role may not create roles. The integration suite runs the app as `art_man_it_web` in it. The live site still connects as the owner until `DEPLOY_VERCEL.md` 0.3; a `--no-privileges` restore needs section 5 of `0023` run again (`BACKUP.md`) |
| **The security code covers more since P7.14** (QA-12) | Besides the figures, bills' money and lines, and entries: each bill's `discount`, `discount_reason`, `book_no` and cancellation reason, the snapshot's `diff_reason`, and the day's `attendance` with its pay terms (sorted by staff id). Not the khata: Month close dates the salary lines on the month's last day, after it is sealed. A day sealed before P7.14 is checked on `securityCodeBeforeP714` — what it covered then — and `computeSecurityCode` can never give that code for a day sealed since. Live's three sealed days were checked both ways on a restored copy |
| A reversal bill and a cancelled bill cannot be edited in place | each is half of a mirrored pair; changing one side alone leaves the day wrong and nothing downstream checks it |
| A bill edit keeps the bill's own lines | no adding, no removing. Adding is a different bill; removing would delete a financial row, which P1.6 deliberately does not do |
| **A developer's edit in a closed month recalculates it** | P1.10 (the client's decision, 2026-09-29). `recalculateClosedMonth` in `features/developer/service.ts`, inside `editBillRow`'s transaction, after `resettleDay`: the month's snapshots read again, `recalculateMonthReport` + `recalculateShares`, `month_closes` updated through the hatch for that one statement, `month.recalculate` written. Nothing is written when nothing moved (`isDeepStrictEqual`) |
| **`recalculateMonthReport` moves only what the days moved** | `lib/accounting/month-report.ts`. Day fields are summed afresh; the net profit moves by Δsales − Δdaily expenses − Δstaff earned, the Owner account by Δonline (reached, net reached) and Δprofit − Δonline (held by the business); salaries, bonuses, monthly expenses, Owner cash, capital repaid and adjustments stay as saved. Tested equal to `buildMonthReport` on the corrected days, and measured equal to a full rebuild on a restored copy apart from a salary changed after the close |
| **The developer's edit claims the month's `month_closes` row `FOR UPDATE` first** | so two corrections in one closed month are worked out one after the other. Measured: two at once in the same month ended equal to a full rebuild (−59,650 → −59,740 → −59,695). A row lock does not fire the append-only trigger |
| **`month.recalculate` is the only record that a closed month was worked out again** | target the month (`2026-09`), `before` {netProfit, report, shares}, `after` the same plus `billNo` and `businessDate`. Only the developer's Audit log shows it: a note on the Monthly report and Partners was built and removed the same day (the user, 2026-09-30) |
| **A developer's account is shown as "System" on the Owner's screens** | the one place they name who did something — the adjustments card — through `recordedBy` (`month-adjustments/rules.ts`), with every name a developer account has had (its username now, and `username.change`'s `before` for the old ones). Never another person's name. `createdBy` and `closedBy` are printed nowhere else outside the developer's own pages |
| **Month close's salary lines sit on the month's last business day** | beside that day's commission and wage, all `earning`. `resettleDay` skips them (`isMonthlySalaryLabel`, `lib/accounting/staff-pay.ts`): before P1.10 it reversed them and posted back only commission and wage, so a change to a bill on a closed month's last day took the salaries out of the khata. Month close writes the label with `monthlySalaryLabel`; the salary slip reads it with `isMonthlySalaryLabel` |
| **A resettle reason becomes a khata label the Owner and the Manager read** | "Corrected: <reason>" in the Staff khata. Never put who did it in it — the developer's edit passes "bill #N changed" since P1.10 |
| **A cancelled bill used to count as a customer visit** | `customerInfo()` excluded reversals but not cancellations. Fixed in P3.8; both halves now go through one shared `realVisit()` condition, so the visit count and the last visit cannot disagree |
| The customer lookup is **4 queries**, and took 1–5 s against Neon | measured in the dev server log during P3.8. Two of them are the last visit and its lines |
| **The tables that grow are now indexed** | migration `0013` (P4.9) added 7: `bills(business_date, bill_no)`, `bills(customer_id)`, `bill_lines(bill_id)`, `cash_entries(business_date, created_at)`, `khata_entries(business_date)`, `audit_log(created_at)` and `audit_log(action, target, created_at)`. Before it, 4 indexes existed in the whole schema and 3 were Better Auth's |
| Tables that gain only a few rows a month are **deliberately unindexed** | `monthly_expenses`, `partner_drawings`, `capital_repayments`. `staff_id` is unindexed on `bills`/`bill_lines`/`cash_entries` too, because there it is only ever joined **to** `staff.id`. `khata_entries.staff_id` is the exception: P4.10 gave it a query that filters on it, so `0014` indexed it |
| **`sum()` on an integer column comes back as a string** | Postgres sums it as `bigint` and `pg` returns that as text. Drizzle needs `.mapWith(Number)` or a balance silently becomes `"30"`. Bitten in P4.10; check any future aggregate |
| Staff khata is **two queries, not the whole table** | `sum ... group by staff_id` for the list, `where staff_id = ?` for the ledger (P4.10). The `KIND_ORDER` sort and the running balance stayed in JavaScript, in `inLedgerOrder` |
| **Staff khata is one month at a time** (P7.15) | The ledger is `where staff_id = ? and business_date` in the month, and what came before is one `sum` — the brought-forward row; `withRunningBalance` starts from it. The month comes from `getMonthChoices` (fetched beside the staff list and the balances, so no extra wait): `?month=` when it has a business day, else the latest day's. The badge is the shown month's; Give bonus only on the latest month, since `giveBonus` dates it on the latest business day |
| A wider index is not automatically a better one | `(staff_id, amount)` was measured against 10,000 rows and **rejected**: the balances `group by` must read every row, so Postgres preferred a sequential scan even with the index available |
| **Postgres does not index a foreign key by itself** | this is why `bill_lines.bill_id` had nothing for 12 migrations. Check it whenever a new table gets a reference |
| The planner ignores an index until the table has statistics | with 27 rows it filtered instead of using `audit_log(action, target, created_at)`; with 18,000 it chose an Index Only Scan. **Do not judge an index on the dev database's row counts** — generate rows in a transaction, `ANALYZE`, then roll back |
| A rolled-back transaction does **not** trip the append-only triggers | they are `BEFORE UPDATE OR DELETE`. So inserting throwaway rows, measuring, and rolling back is a safe way to test against a realistic table size |
| **`user.active` is read on every request** | it is declared in Better Auth's `additionalFields`, so it rides along on the session and `getCurrentUser()` needs no second query. The price is that the column must exist wherever the code runs — see the live-database warning in section 4 |
| `validateUserInfo` does **not** run for a username and password | Better Auth only re-validates provider-returning sign-ins. To refuse a sign-in for a stored reason, the documented place is `databaseHooks.session.create.before`, which is where the closed-account check lives |
| An `APIError` from that hook reaches the browser with its `code` | measured: `{"code":"ACCOUNT_CLOSED","message":"This account has been closed."}` with status 403. That is what lets `sign-in-error.ts` tell it apart from a wrong password, which is also 403 |
| A `redirect()` from `requireRole` inside a Server Action **navigates**, it does not return an error | so a form calling an action it is not allowed to call shows no message — the page simply moves. Mistaken for a broken feature once during P1.2 |
| `bill_lines` has **no order column** | both the developer's edit screen and the last-visit strip order by `name`, so the two lists look alike |
| **The error boundary prop is `retry`, not `reset`** | Next 16. `retry()` re-fetches and re-renders, `reset()` only re-renders. Stable since 16.3.0, and this project is on 16.3.7. The old name would silently be `undefined` |
| `error.tsx` does **not** wrap the `layout.tsx` beside it | it wraps `page.tsx`, `loading.tsx`, `not-found.tsx` and **nested** layouts. `requireUser()` runs in `(app)/layout.tsx` and touches the database, so that failure is caught one level up by `src/app/error.tsx` — which is why both files exist |
| A `redirect()` is **not** swallowed by an error boundary | `getDerivedStateFromError` re-throws anything `isNextRouterError` matches (read in `next/dist/client/components/error-boundary.js`). So adding `error.tsx` could not break the auth redirects |
| `global-error.tsx` gets **no global styles** | it replaces the root layout, so Tailwind and the theme are gone. Its styles are inline, and changing the app's look will not change that screen |
| CI needs **no secrets** | the build passes with no environment variables and `pnpm test` never opens a database; the integration job (P7.9) brings its own `postgres:18` service container, password `postgres`, gone with the job |
| `get_page_text` reads `<main>` only | a Base UI dialog renders in a portal outside it, so a confirmation dialog looks absent when it is open. Use `read_page` or query `[role="dialog"]` instead |
| **`DayBill` already carries everything a receipt shows** | bill number, time, customer, lines with staff names, cash, online and total. So reprinting a bill (P3.6) needed **no new query** — Today's bills reprints from the list it has already loaded |
| A Base UI dialog is a **direct child of `<body>`** | measured with one open: 9 body children, 8 of them the page. That is what lets the print rules keep the slip and hide everything else, with `body:has([data-print-receipt]) > *:not(:has(...))` |
| A dialog takes about **a second to unmount** after closing | it goes, but not at once. P3.6 marks the slip only while the dialog is `open`, so a second receipt opened in that window cannot put two slips on one sheet |
| `bill_lines` does not store a line's **note** | "Special rate" / "Deal share" are worked out while pricing a cart, never saved. A reprint cannot rebuild them — the receipt does not print them, so both paths still print alike |
| **The receipt prints from the same markup it shows** | `window.print()` plus rules in `globals.css`, not a second copy built for paper. A separate print template is exactly the thing that drifts out of step with the screen |
| **`globals.css` is the only file that decides a colour, a size or a radius** | P6.1. Before it: 222 font sizes written as `text-[12.5px]` and three neighbours, 130 uses of an off-grid `px-[18px]`, 49 cards typed out by hand, ~77 hex colours. All four are now zero. If a value is missing, add a token there rather than an arbitrary utility in a component |
| **The 222 font sizes had one cause: `body` had no font size** | the app is designed at 14px (`docs/art-saloon.html` says so) and the browser's default is 16, so every piece of text was opting out. Setting it on `body` is what made the sweep possible — most text now needs no size class at all |
| `--pad-card` is a plain custom property, not a theme token | a theme token is static, and card padding has to change with the viewport (16px on a phone, 20px above `sm`). It is reached through the `px-card` / `p-card` utilities |
| **`Button` defaults to 40px and `lg` is 44px** | it was 32px, which is why ~36 call sites wrote `className="h-10"`. `Input`, `NativeSelect` and `Textarea` are 40px to match — the first time a field and the button beside it have been the same height |
| A field's text is forced to 16px below `md`, from `globals.css` | iOS Safari zooms the page in when a focused field is smaller. Doing it in the base layer means no field has to carry `text-base md:text-sm` to avoid it |
| **`Panel` is the box every screen is made of**, and `panelClass` is its look on its own | `components/panel.tsx`. The `Card` in `components/ui/` is the shadcn primitive and this app has never used it. `panelClass` exists for the handful of panels that must be a `<form>`, `<nav>` or `<ol>` |
| A `Badge`'s variant is its meaning | `success` / `warning` / `destructive` / `info` / `brass`, replacing 35 hand-written colour pairs. Each has a hairline border as well as a tint, because a pale tint alone is nearly invisible on a white row |
| **Below `lg` the sidebar is not rendered at all** | `MobileNav` is a different shape — a top bar, a drawer and a bottom bar — not the same element reflowed. The one element that tried to be both became a horizontal scroller holding all nineteen links |
| Which four screens sit in the bottom bar is data | `primary: true` in `nav-config.ts`. Four at most: the fifth slot opens the drawer |
| **`.table-stacked` makes a table a card per row below `md`** | each cell's heading comes from its own `data-label`, and `data-row-title` marks the one that leads. One set of markup rather than a table plus a phone copy of it. On four tables: Today's bills, the Daily report, Daily folders, the Staff khata |
| The stacked row is a **flex column**, so `order` can pull the title up | a table's column order is decided for a wide screen — the bill number is the *second* column in Today's bills — but on a card it has to lead |
| **The drawer closes on a route change by adjusting state during render**, not in an effect | `react-hooks/set-state-in-effect` fails the build on the effect version, and an effect would also close the drawer one paint after the new screen had already appeared behind it. It catches a Back, which no click handler sees |
| **The developer may reset their own password; no other role may** | P1.7. Everyone else has somebody above them — the Owner and the Manager are rescued from that same screen. A salon with one developer account has nobody, and Settings only helps someone who still knows their password |
| `signOutEverywhere` takes a `keepToken` | `src/db/user-account.ts`. It spares the session doing the resetting, which is the whole reason a self-reset is possible: without it the developer is signed out by their own click |
| A self-reset is audited as **`password.self-reset`** | a different action from `password.reset`, so the log says which of the two happened rather than leaving it to be inferred from actor and target being equal |
| **`next dev` prints Server Action arguments in full** | measured 2026-09-23: `resetPasswordAction({"newPassword":"...","userId":"..."})` appeared in the dev server log in clear text. Only the dev server does this, but it means a password typed into a form while `pnpm dev` is running is in that terminal's scrollback |
| **A dead session is proved by re-fetching the page, not by looking at it** | `await fetch(url, {redirect:"manual"})` returning **200** means `requireRole` let it through; a killed session redirects to `/login`. This is what verified P1.7, and it does not depend on the Browser pane having rendered (trap 8.0e) |
| **`checkResetPassword` refuses everyone but the developer** | P1.8. It guards the Users screen *and* the Server Action, because the screen hides what the function refuses and the action refuses it again — one function, so the two cannot drift |
| That refusal never says the word "developer" | the Owner and the Manager are not shown that the role exists (`visibleRoles`), and an error message is a poor place to break that. A test asserts the string does not match `/developer/i` |
| **`PasswordInput` is on all twelve password and PIN fields** | `src/components/password-input.tsx`. It swaps `type="password"` for `type="text"`, so a password manager still sees an ordinary field. The toggle is `type="button"` — otherwise it submits the form it sits in — and `tabIndex={-1}`, so Tab reaches the next field rather than the eye |
| A username is case-folded and unique | `username-rules.ts` decides the shape; `user.username` is `text().unique()` in the database, which is the actual guarantee. `username` is stored lower case and `displayUsername` keeps the capitals — the plugin's own convention, which `seed-developer.ts` also follows |
| **The proxy never sees a path with a dot in it** | `src/proxy.ts`'s matcher skips `.*\..*` so that `icon.png` and the like pass. A route folder named with a dot (`app/x.y/`) is therefore not gated by the proxy at all. Every page still calls `requireUser`/`requireRole`, so nothing is exposed — but a new page must never rely on the proxy alone. P6.4 used this on purpose for a throwaway read-only harness |
| **A saved line's amount is net of the bill's discount** | P3.10 shares the discount onto the lines, and `bill_lines.amount` keeps the result. Anything that turns a saved bill back into a cart must add it back first, or the discount is taken twice — and must keep each deal's split, or commission moves when a list price has (P3.14). `restoreSaved` in `billing/bill-draft.ts` does both, for re-opening (P3.13, P3.14); the server works a deal's split out from the saved bill itself, never from the browser. Neither the discount's split nor the deal's is stored; they are worked back out and checked with `priceCart` |
| **There is no dark mode, and `@custom-variant dark` must stay** | Removed in P6.8. The line in `globals.css` ties `dark:` to a `.dark` class the app never sets. Delete it and Tailwind 4 falls back to the device's own dark setting — so `dark:` classes in any shadcn primitive added later would switch parts of a screen dark on a phone set to dark |
| **Renaming an account does not end its sessions** | a session is bound to the account's id and knows nothing about its username. The *next* sign-in needs the new one, which is why the screen says so |
| `/developer/passwords` is called **Accounts** now | it sets passwords and PINs *and* names the developer's own account |
| **The logo is two PNGs, not one tinted with CSS** | `public/logo.png` (the artwork's own black and brown, for light surfaces and the printed slip) and `public/logo-light.png` (cream, for the navy panels). `SalonLogo` picks between them with `onDark` |
| Cutting white off a **JPEG** needs more than a colour key | alpha from inverted luminance, then a 6%–92% threshold curve to clear the ringing that otherwise shows as a grey box, then un-premultiply against white: `C = (c − 255(1−a)) / a`. The generator is not kept in the repo — it ran once; the recipe is here |
| **The favicon is `src/app/icon.png`**, not `favicon.ico` | Next's file convention. `apple-icon.png` sits beside it. The old `.ico` was deleted, not regenerated |
| The icon is the **whole lockup**, not the moustache | every crop that excluded "ART" and "MEN'S SALON" also clipped the curls, which reach into both bands. Tried and rendered before choosing |
| **A flex column stretches an image across its cross axis** | the sidebar rendered the logo 232 × 44 against an artwork ratio of 1.47. `w-auto` does not resist `align-items: stretch`. `items-start` on the container fixes it; `object-contain` on the image stops the next container doing it again |
| `pnpm test` never sees a `.tsx` file | `vitest.config.mts` includes `src/**/*.test.ts` only, so no test covers a component. A UI change is verified by building it and looking at it, not by the suite going green |

---
| **Better Auth's `after` hook sees a failed sign-in** | when an endpoint throws an `APIError`, the dispatcher catches it, writes it to `ctx.context.returned` and *then* runs the after hooks — read in `better-auth/dist/api/dispatch.mjs`. That is what makes P3.9 possible at all; a refused sign-in is an ordinary return value there, not an exception |
| Each refusal carries its own code | measured 2026-09-23: wrong password → `INVALID_USERNAME_OR_PASSWORD` (401), unknown username → `INVALID_USERNAME` (422), closed account → `ACCOUNT_CLOSED` (403). The audit log stores the code, so the three are told apart |
| **A bonus is in no day snapshot** | it is a khata line given on the Owner's word, not worked out from bills. `buildMonthReport` takes `bonuses` separately (P3.1) — anything else added to the khata without going through Day Close will have the same problem, and the month report is where to fix it |
| `customer_special_rates` is an upsert on `(customer_id, service_id)` | that pair is the primary key, so setting a rate twice corrects it rather than failing (P3.2) |
| `customers` and `customer_special_rates` have **no** append-only trigger | they are config, so editing a name or a rate is an ordinary UPDATE. Only a customer's name and phone may be edited, and both sides go to `audit_log` (spec §11) |
| **`pg_dump` 18.4 works against Neon 18.6, even through the pooled string** | measured 2026-09-23. The direct string is still preferred and `pnpm db:backup` says so when it has to fall back |
| A backup carries `drizzle.__drizzle_migrations` | so a restored database knows which migrations it has and `pnpm db:migrate` carries on from the right place |
| **`scripts/load-env.ts` must be the first import** | `src/db` builds its pool the moment it is evaluated, so the env has to be in place before that import runs. ES modules evaluate in import order, which is what makes the one-line import work |
| An environment variable still beats `.env.local` after P4.8 | verified by pointing `pnpm db:check` at `127.0.0.1` and watching it refuse there instead of reaching Neon |
| **The feature conventions are a test now, not a document** | `src/features/conventions.test.ts` (P4.1). It checks the five role-file names, that nothing else sits in a feature folder, that `actions.ts` starts with `"use server"` and checks a role, that pure files import no `@/db`/`react`/`next` **value**, that every pure file has a test importing it, and that no feature imports another. Each check was confirmed to fail when broken |
| `import type` does not make a file impure | all five "impure-looking" pure files only import `DayBill` as a type, which is erased at build. The test parses the import clause rather than matching the module name |
| **`features/auth` no longer exists** | its one file, the login form, is `features/account/components/login-form.tsx` (P4.3). `lib/auth` is about who is signed in; `features/account` is the screens |
| `module` is a reserved name in this ESLint config | `@next/next/no-assign-module-variable` fails the build on `const module = ...`, even inside a test. Cost a minute in P4.1 |
| **A discount is shared into the line amounts, not kept aside** | P3.10. `priceCart` splits it with `allocate`, so commission (`workByStaff`), the khata, the day's sale (`salesTotals` adds cash and online) and the month report all follow it without one of them knowing discounts exist. `bills.discount` is the record, never the source of a total |
| Measured on the day it was built | a Rs 1,100 bill with Rs 300 off stored lines of **582 and 218**, and Day close read that staff member's work as **Rs 1,100 rather than Rs 1,400** |
| A discount can never take a line below zero | each share is at most its own line, because the discount is refused unless it is **less than** the subtotal. A bill cannot be given away, which also keeps `checkPayment`'s "total must be more than 0" true |
| A reversal bill carries `-discount` | so a cancelled bill nets out in that column as it does in cash and online. Nothing sums it today except the daily report, which is exactly why it had to be right |
| **The receipt does not print a subtraction** | the listed prices are already net of the discount, so a "subtotal − discount = total" block would contradict the lines above it. The slip says *"Includes a discount of Rs 300 (1,100 before)"* instead |
| **A chosen price is the line amount, not a modifier** | P3.11, the same shape as the discount: `priceCart` writes the counter's choice into `bill_lines.amount`, so commission, the khata, the day's sale and the month's profit follow it without any of them knowing ranges exist |
| `services.max_price` null means one fixed price | every service behaved that way before, and the column defaults to null, so nothing had to be migrated or back-filled |
| **A screen must not read a priced line to decide what to render** | when `priceCart` throws — an amount outside its range — every priced line is undefined. The cart's amount box and the line's name were both derived from it, so typing a wrong number made the box *and* the service name disappear. Both now come from the catalog. Found by using the screen, not by reading it |
| A deal splits on the **bottom** of a range | the deal's own price is what the customer pays, so there is nothing to choose; the split only decides how it is shared for commission |
| **The service worker never caches a page — except the three offline pages** | `public/sw.js` (P2.2a, P2.2d, P2.2e). Pages are server-rendered per person with that moment's figures, so a cached one would show old numbers as current and outlive a sign-out. Kept: `/_next/static/*` (hashed), `/offline.html` + `/logo.png`, and the static `/offline-billing`, `/offline-folders` and `/offline-register` with every file each HTML names (cache `shell-v1`, each stored only once all its files are in). With no network, `/` and `/billing` **redirect** to `/offline-billing`, `/folders` to `/offline-folders`, `/daily-report` and `/worksheet` to `/offline-register` (a redirect, so the URL and Next's router agree); any other page gets `/offline.html`, which offers each offline page it finds kept. The list lives in `SHELL_URLS` / `OFFLINE_FOR` there and in `lib/offline/pages.ts`; `pages.test.ts` reads `sw.js` and fails when they part |
| **The worker keeps the offline pages only when asked by a signed-in page** | The page posts `{ type: "cache-offline-pages" }` (`keepOfflinePages()` in `components/pwa-setup.tsx`; the worker still answers the pre-P2.2e `cache-offline-billing`) on every load, on `controllerchange`, and after every copy `CatalogSync` saves. The worker fetches each page with `redirect: "manual"`: signed out, the proxy's redirect is refused and **nothing is kept**, so the login page can never become an offline page |
| **The offline pages are static pages outside `(app)`, one per feature, in one frame** | `app/offline-billing` → `features/billing/components/offline-billing.tsx`, `app/offline-folders` → `features/folders/components/offline-folders.tsx`, `app/offline-register` → `features/worksheet/components/offline-register.tsx`. Each renders inside `components/offline-page.tsx` (P2.2e): the 12-hour check, the tabs between the three (plain links — the worker opens each page), the "internet is back" bar, and `OutboxSync` (with `refreshScreen={false}`), `CatalogSync` and `DaySync`, since the signed-in shell is not there. Online, the proxy still wants a session cookie for them |
| **A copy of the open day lives in the browser beside the catalog** | P2.2e. `/api/offline/day` (`db/queries/day-copy.ts`): the day's bills (`getDayBills`), folder entries (`db/queries/day-entries.ts`) and every staff member, `no-store`. Kept in the `catalog` store under key `day` (no new IndexedDB version) by `components/day-sync.tsx`, which fetches on mount, on return to online, every 5 minutes and on `requestDayRefresh()` — called after every Save, cancellation and outbox send. `dayFor` shows it only when its date is the catalog copy's business date. Sign-out clears it with the catalog. P2.2f needs the same data for an offline close |
| **The outbox holds folder entries too, in the same line as the bills** | P2.2e. `OutboxFolderEntry` (`type: "folder"`, an expense or a staff advance) beside `OutboxEntry` (a bill, no `type`); `readOutbox()` returns both, in the order made, and `syncOf` sends each to its route (`/api/offline/sync` or `/api/offline/folders`). A pre-P2.2e tab's `isOutboxEntry` skips a folder entry, which the current build sends |
| **A folder entry is saved once per `client_id`** | P2.2e, migration `0019` (`cash_entries_client_id_unique`). `addEntry` answers a known id with `{ alreadySaved: true }` before any other check, so a send whose answer was lost is answered even after its day closed; two at once are settled by the index. The online Folders form sends an id as well, and a Save whose answer is lost goes to the outbox under it rather than being asked about |
| **What is still on this computer is shown, and counted, beside the server's rows** | P2.2e. Daily folders' totals are worked out in the browser (`FoldersScreen`, the same `folderTotals`) from the server's rows plus the outbox's; the register draws pending bills after the server's (`buildSheet(bills, staff, pending)`). `waitingBills` / `waitingFolderEntries` leave out any id the server already lists, so nothing is counted twice. After a pass that saved anything, `OutboxSync` refreshes the screen (`router.refresh()`), or a sent entry would vanish until the next load |
| **The 12 hours are counted from the copy's `savedAt`** | `lib/offline/session.ts`. `saveCatalog` stamps `savedAt` (device clock) — the copy is only handed to a signed-in session, so saving one is the server confirming the sign-in. A clock set back more than 5 minutes ends the window. `BillingScreen.keep()` checks at every offline Save; the offline page checks on open |
| **`T-` numbers live in IndexedDB v3, store `counters`** | Key `temp:<businessDate>`, counted up in one transaction (`nextTempNo`). Never cleared, not even at sign-out. The number goes into the bill's `bookNo`; a bill with a paper book number keeps that and gets no `T-` number. `slipLabel()` in `lib/offline/slip.ts` shows either |
| **"Online" means the server answered, not `navigator.onLine`** | `src/lib/connectivity.ts`: a `HEAD` to `/manifest.webmanifest` with `cache: "no-store"`. The worker does not intercept that path, so a cached copy can never fake an answer. Wi-Fi with dead internet fires no `offline` event, which is why the store re-probes every 20 s |
| **`experimental.useOffline` is off on purpose** | it re-sends a failed Server Action when the network returns; a `createBill` whose *response* was lost would save twice. Its `useOffline` hook needs the flag, so the app has its own `useConnectivity` |
| The worker registers **in production only** | `pwa-setup.tsx`. In `next dev` it unregisters any worker instead — a local `pnpm start` on port 3000 would otherwise leave a worker serving old chunks to the dev server |
| **A bill is saved once per `client_id`** | P3.15, migration `0018`, `bills_client_id_unique`. `createBill`/`editBill` look the id up first (`savedEarlier`) and answer a repeat with the bill already there; two requests at the same instant are settled by the unique index and the loser answered the same way (`lostTheRace`). Measured with two simultaneous calls: one bill, one customer |
| **A failed `fetch` does not mean nothing was saved** | "Failed to fetch" can come after the server has committed — #32 did exactly that. Only the server can say, which is why the screen asks `findSavedBillAction` rather than assuming either way |
| A rejected Server Action inside `startTransition` goes to the **error boundary** | and takes the screen's state with it — the counter lost the cart as well as the answer. `billing-screen.tsx` now catches it. Any other screen that awaits an action in a transition still falls over the same way on a lost connection |
| **Next dispatches Server Actions one at a time per client** | `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`. A background call made as an action would queue "Save bill" behind it. This is why P2.2b's catalog comes from a Route Handler |
| `unstable_isUnrecognizedActionError` | from `next/navigation`: the screen is from an older deploy and the server does not know the action, so it never ran. The billing screen says "reload" on it |
| An action's id is **stable across builds** while its file is unchanged | measured 2026-09-26: `createBillAction` kept `4080281036…` over two builds. Its chunk's file name **did** change when the chunk's content did (`41nr_msyvi4hk.js` → `2mphcp9mkd3ej.js`) — which is what makes the worker's cache-first on `/_next/static` safe |
| Drizzle 0.45 wraps a driver error | in `DrizzleQueryError`, with the `pg` error — and its SQLSTATE `code` — as `cause`. `isUniqueViolation` (`lib/errors.ts`) walks the chain |
| **The counter's offline copy is one IndexedDB record** | P2.2b: `art-man-offline` v1, store `catalog`, key `current`, replaced whole. From P2.2c a store may hold unsent bills, so **never delete or rename a store** — add one with a version bump |
| **The outbox is IndexedDB `art-man-offline`, store `outbox`** (since v2; the database is v3 since P2.2d, and P2.2e added no version) | P2.2c. Keyed by an auto-increment `seq` (queue order that survives a clock change), unique index `clientId`. Items are `OutboxEntry` (a bill) or `OutboxFolderEntry` (P2.2e) in `lib/offline/outbox.ts` (`v: 1`). **Nothing empties it** — sign-out keeps it; an item leaves only when the server has it or a person removed it with a reason. Every write is announced on BroadcastChannel `art-man-outbox` |
| **The sync's answers: only 200 and 422 are final** | `outcomeOf(response, body, kind)` in `lib/offline/outbox.ts`, matched by `app/api/offline/sync/route.ts` (200 `{ billNo, alreadySaved }`) and `app/api/offline/folders/route.ts` (200 `{ alreadySaved }`). 200 → it leaves; 422 → it waits in Needs attention (bills on Billing, entries on Daily folders); 401 or an `opaqueredirect` → waits for a sign-in; anything else (500, 503, 403, network, timeout) → sent again later. A machine never drops either |
| **An offline bill goes into the day it was made on, or nowhere** | `createBill(user, input, offline)` refuses it when `offline.businessDate` is not the open day — but only after the `client_id` check, so a bill that did arrive is still answered with itself after its day closes. The screen's "Open in billing" saves through the ordinary `createBillAction`, into the open day, under the same id |
| **Offline audit actions** | `bill.create` with `after.offline` (`madeAt`, `madeBy`, `catalogVersion`); `bill.offline-refuse` (`success: false`, every refusal, with what was sent); `bill.offline-discard` (the reason and the entry; one per bill). All three target `offline bill <client_id>` or the bill number, so a refused bill and the bill it became can be matched by id. Folder entries (P2.2e) mirror them: `folder.expense` / `folder.staff_advance` with `after.offline` (`madeAt`, `madeBy`), `folder.offline-refuse` and `folder.offline-discard` targeting `offline entry <client_id>` |
| **A Route Handler gets no Origin check** | Next compares Origin with Host only for Server Actions (`node_modules/next/dist/server/app-render/action-handler.js`). `lib/same-origin.ts` repeats it for both syncs (bills, and folder entries since P2.2e); any future Route Handler that writes must call it too |
| The copy holds **every customer** (since P2.2d) and **who it was made for** | `catalog.customers` (id, phone, name, special rates) — the user's choice, section 9 question 4; before P2.2d only customers with a rate (`customersWithRates`, now refused by `isCatalogCopy`). `user` (id, name, username, role) is what an offline bill records as `madeBy` and what the offline page names. The version still fingerprints prices only, so it did not change |
| `getActiveCatalog()` is read by the billing screen **and** the copy | `db/queries/catalog.ts`. Moving the screen onto it is what guarantees the two agree; the deal rule inside it is `offeredDeals()` in `lib/catalog.ts` |
| **A deal's `serviceIds` order is part of its price** | `allocate` gives the leftover rupee by position. `deal_items` is read without `ORDER BY`, so the order is whatever Postgres returns — the same for the screen and the server today. `pricingFingerprint` keeps it rather than sorting it |
| `checkUser()` holds the sign-in and maintenance checks | `lib/auth/session.ts`. `requireUser` turns a refusal into a redirect; `/api/offline/catalog` answers 401/503 instead |
| **`next dev` writes to `.next/dev`** | Next 16 (`docs/01-app/03-api-reference/06-cli/next.md`): `next build` and `next dev` can run at the same time. Measured 2026-09-28 — a build during the user's dev server left it serving 200. Trap 8.0b predates this |
| **A day's close waits in the outbox behind its day's work** | P2.2f. `heldBack` (`lib/offline/outbox.ts`): a `type: "close"` item is not sent while any bill or entry of the same `businessDate` is in the outbox, waiting or refused. `nextToSend` skips it and sends later work meanwhile. Once the server has closed a day, nothing made offline for it can be saved — so the order is the whole point |
| **One close per id, and the id lives in the audit log** | P2.2f, no migration. `closeDay` looks up a `day.close` row whose `after->>'clientId'` is the id (`closedEarlier`) before anything else, and again when its claim on the day finds it already closed (two sends at once). `audit_log` is append-only, so a re-send is answered `alreadySaved` with the code it made even after a reopen |
| **An offline close is kept only if the server's expected cash matches** | `closeDay(user, input, offline)` compares `offline.expected` with its own `summary.expectedCash` inside the transaction and throws before writing anything; the claim on the day rolls back with it. Measured: a Rs 100 expense added on the server after an offline close → refused with both figures, the day still open |
| **The day copy carries what a close reads before the count, and no more** | `DayCopy.close` (P2.2f): opening cash, and `pay` and `khata` by staff id for `loadDay`'s list only — the active staff and anyone switched off with work on the day (P7.13). `pay` is a `DayPay` (`dayPayOf`): pay type, daily wage and commission rate, each zeroed where the type does not pay it, never the salary; the online Day close's `CloseStaffRow` is the same. A copy kept before P2.2f has no `close` — `closeCopyOf` returns null and the offline close says so; one kept before P7.13 has salaries, which `localDayOf` drops. `getAllStaff` does not read the salary column; `getRegister` maps its pay away so the Daily report's payload does not carry it. The server's close still saves the whole pay on `attendance`, from its own rows (P7.3) |
| **The honest count is the screen's, not a secret** (P7.13) | Both Day closes show expected cash only after the count. The figures behind it are not hidden from the Manager anywhere: the opening cash is the last day's count (Daily report "Counted", a closed Day close's "Tomorrow's opening cash"), and the day's bills and entries are on Billing, Daily folders and the Daily report. So the offline copy's opening cash was kept (QA-08's written trade-off): an offline close cannot work expected cash out without it |
| **The browser's close and the server's agree to the rupee** | `reviewLocally` (`features/day-close/offline-close.ts`) is `summarizeDay` + `expectedCashBreakdown` on the copy plus the outbox, as `reviewClose` is on the database. Measured 2026-09-29 on the same inputs: Rs 26,272 both ways, every breakdown line equal |
| **Both copies are fetched again the moment the business day changes** | `requestCatalogRefresh()` (new, `components/catalog-sync.tsx`) beside `requestDayRefresh()`: after a close on the screen, a close sent by the outbox, Start next business day, a reopen and the first day. Measured: both copies on the new day within 3 s of Start next business day |
| **A day closed on this computer takes nothing more** | `closeOf(outbox, businessDate)` — a close for the day, waiting or refused — blocks Save on Billing (except a refused bill of that day being put right) and on Daily folders, online as well as offline (`components/closed-here-note.tsx`). The server still has the day open until the close arrives, and would take the bill |
| **A closed month's mistake counts in the open month** | P3.4. `month_adjustments` (migration `0020`): `month` is where it counts, `corrects_month` what it corrects, `amount` signed as the closed month's figure should have read. `adjustmentEffect` (`lib/accounting/adjustments.ts`) is the one place that says what a kind does: a sale moves the profit (and the online money if online), an expense the profit (and the Owner-paid costs if the Owner paid), what a staff member earned the profit and the khata, what they took the khata only. `getMonthlyReport` adds up the month's rows, cancellations included, into `MonthReport.adjustments` and `adjustmentsToOwner`; frozen reports from before P3.4 have neither, so read them with `?? 0` |
| **The month report never reads the khata's `adjustment` lines** | Four things write them: a reopen's and a correction's reversals (with `reverses_entry_id`), a cancelled advance ("Advance cancelled", **without** one), a P3.4 staff adjustment (linked from `month_adjustments.khata_entry_id`) and its cancellation (with one). So "adjustment with no `reverses_entry_id`" does not identify P3.4's lines; the profit comes from `month_adjustments` alone |
| **A month is closed only once it is over** | P3.4. `closeBlockers` refuses until the month's last calendar day (`lastDateOfMonth`) has been a closed business day. `startNextDay` is `nextDate`, so a month closed early would have opened its next day inside the frozen month, counted in no month's report |
| An adjustment's khata line sits on the latest business day, even a closed one | as a bonus does (P3.1). Khata lines are in no day's security code (`computeDayCode` hashes bills, lines and cash entries), and `resettleDay`/`reopenDay` reverse only `earning`/`payment` lines, so it disturbs neither |
| **The salary slip is the khata, added up** | P3.3. `buildSlip` (`features/staff-khata/slip.ts`) takes every khata line of the person: those before the month are the balance brought forward, the month's are sorted into commission, wage, salary, bonus, payments, advances and adjustments. A reversal counts where the line it reverses counted (`reverses_entry_id`), so every total is net of reopens and corrections; an adjustment with a `cash_entry_id` is an advance's cancellation; earnings are told apart by the labels Day close and Month close write. The closing balance is the khata's own — checked on a restored copy for two staff members, equal to the rupee |
| **`pdf-lib` is a server-only dependency since P3.3** | Standard Helvetica only, so nothing is embedded; it writes a Western character set, and `pdfSafe` turns anything else (a name in Urdu script) into `?` rather than fail. `/api/staff-slip?staff=&month=` is a GET for any signed-in role, `no-store`, `attachment`. The screen fetches it and saves the blob, so a refusal is said on the screen instead of being saved as a file. **Run `pnpm install` after pulling** |
| **Nothing is sent anywhere, by design** | The client, 2026-09-29: no WhatsApp, no SMS. The Day close summary preview (`summary-text.ts`) was deleted with `SnapshotRow.cancelledBills` and the query that counted them |
| `useOutboxReady()` | false until the page has read the outbox once. Day close waits for it: an empty `useOutbox()` before the read means "not read yet", and the steps must never be offered over a close already made here |
| **Every Server Action checks its role before its input** (QA audit, 2026-09-30) | So posting `{}` to an action as each role tells allow from refuse without writing anything: a refusal answers with an `x-action-redirect` header, an allowed call with the Zod error in the RSC body. All 46 were called that way as Manager, Owner and Developer (135 calls) and matched the role matrix. How to post one: trap 8.27 |
| **Row triggers do not fire on TRUNCATE**, and any connection can open the hatch with a session-level `SET` | Measured on a local copy (QA audit). Only `db/financial-edit.ts` sets the key, with `is_local = true`, and that setting was gone after commit, rollback, an error, and across the app's pool. Backlog P7.14 |
| **Every cancellation is unique on the row it cancels** (P7.2, migration `0021`) | `cash_entries_voids_entry_id_unique`, `partner_drawings_voids_id_unique`, `monthly_expenses_voids_id_unique`, beside `month_adjustments_voids_id_unique` and `bill_cancellations`' primary key. Before `0021` five concurrent cancels wrote five reversals (QA audit; measured again on a copy without the constraints). The services keep their "already cancelled" check and translate a violation of that one constraint — `isUniqueViolation(error, name)` |
| **`isUniqueViolation` takes a constraint name** | `lib/errors.ts`. Name it when the transaction writes more than the row it is about: a closed-day cancel also re-settles the day, and a clash there must not read "already cancelled". Without a name it matches any 23505, as before |
| **`saveOnce` is how an Owner money form saves exactly once** | `db/save-once.ts`, P7.2: look the client id up first (before any other check, so a repeat of an installment that paid off the debt is answered, not refused), run the save, and answer a unique violation on the id with `{ alreadySaved: true }`. Used by `addInvestment`, `addRepayment`, `addDrawing`, `addOther`, `giveBonus`, `recordAdjustment`; `client_id` is on their six tables (on `khata_entries` only bonus lines carry one). Bills and folder entries keep their own versions (P3.15, P2.2e) |
| **`useSaveId` and `thrownSaveMessage`** | `components/use-save-id.ts`, P7.2. The id stays until the save is known to have worked, then `next()`; in a dialog it is renewed on close. `FormDialog` now catches a thrown Save (`savesOnce` picks the wording); before, a dropped connection took the screen to the error boundary (section 7, "A rejected Server Action inside `startTransition`") |
| **An installment and a fixed monthly amount are worked out under a row lock** | P7.2. `addRepayment` claims `capital_contributions` (item, partner) and `setFixedAmount` claims the `fixed_expense_lines` row `FOR UPDATE`, then read and check inside the same transaction. Measured with HEAD's code on a copy: two Rs 240,000 installments at once against Rs 250,000 both went in (Rs 480,000 repaid), and five saves of Rs 5,000 wrote Rs 25,000 |
| **A day's security code depends on the order `bill_lines` comes back in** | `computeDayCode` has no ORDER BY on the lines: forcing a merge join or a seq scan gave a different code for the same day (QA audit). Backlog P7.8 |
| **Sign-in is limited twice** (P7.12) | (1) The account lock: 5 wrong passwords for a username in 15 minutes → `TOO_MANY_ATTEMPTS` (429) with minutes left, from the audit log, every refusal written as `login.throttled`; a `login.ok` or `password.reset`/`password.self-reset` for that username ends the count. (2) Better Auth's limiter, production only, in memory: `/sign-in/*` 10 a minute per address (`CLIENT_IP_HEADER`), refusing before the app with "Too many requests" and writing nothing. Before P7.12 only (2) existed, at its default 3 per 10 s, unaudited, and a changed `X-Forwarded-For` escaped it on a build with no proxy in front |
| **A `before` hook's error skips the `after` hooks** (Better Auth 1.7, `api/dispatch.mjs`) | So the sign-in lock writes its own audit row before it throws. Only an error from the endpoint itself reaches `ctx.context.returned` and the `after` hooks — which is how `login.failed` is written (P3.9) |
| **Better Auth's limiter runs in the router, not in `auth.api`** | `onRequestRateLimit` is called from the router's `onRequest`, so `auth.handler(request)` is limited (in production) and `auth.api.signInUsername()` never is; hooks run for both. Its 429 returns before any plugin `onResponse` |
| **The Owner's cash is cancelled only with the Owner's PIN** (P7.1) | `isOwnerCash` (`lib/accounting/folders.ts`) is the rule; `voidEntry` asks for the PIN last, after every other refusal, so a try is never spent on a cancellation refused anyway. Any role, as for making one. Owner cash in a closed day has no screen, but the service asks there too |
| **`confirmOwnerPin` is serialised with `pg_advisory_xact_lock(hashtextextended('pin:owner', 0))`** | P7.1, QA-07. The count, the check and the `pin.wrong` insert share one transaction, and the refusal is thrown after it commits (thrown inside, the record would roll back). Measured on a local database: 20 wrong PINs at once → 5 checked, 15 "Too many"; HEAD's code checked all 20. It runs everything on `tx` — the pool is 5 connections, and a second one taken while waiting on the lock could exhaust it |
| **Any open Owner's PIN confirms; a closed Owner's never does** | P7.1, QA-10. Before it the hash came from `where role = 'owner' limit 1` — no order, no `active` filter — and on a local copy a closed Owner made first was the one checked. Tried in `createdAt` order; the match is `after.pinOf` in the audit log. Wrong tries still count together under target `owner` |
| With a year of data (18k bills, 38k lines) every screen renders in 33–85 ms | Production build on a local database, warm (QA audit). Staff khata was the exception — 210 ms and 1.4 MB, the whole ledger — until P7.15: a year of one karigar measured 1,341,784 bytes and 106–133 ms before, 61,798–169,882 bytes and 26–31 ms with one month. Every hot query uses its index |
| **The integration suite is `tests/integration/`, run by `pnpm test:db`** (P7.9) | `vitest.integration.config.mts`: `global-setup.ts` migrates `art_man_it_template` (drizzle's migrator, as `pnpm db:migrate`) and provides the server URL; `setup.ts` runs in each file's worker before its imports, copies the template (`CREATE DATABASE … TEMPLATE`), sets `DATABASE_URL` and `BETTER_AUTH_SECRET`, and mocks `next/headers` and `next/cache`. Teardown drops every `art_man_it_*`. Outside `src/`, so `pnpm test` (`src/**/*.test.ts`) never sees it and the conventions test does not apply — a scenario may use several features |
| **`vi.mock` in a setup file reaches the code under test, but not a package** | `next/headers` mocked in `setup.ts` is what `lib/auth/session.ts` gets. Better Auth's `nextCookies` imports `next/headers.js` itself, from `node_modules`, and gets the real one — which throws outside a request, and the plugin catches that and skips setting the cookie. So `auth.api.signInUsername({ asResponse: true })` works in a test, and its `Set-Cookie` is the cookie |
| **React's `cache` does not memoise outside a server render** | measured: `cache(fn)` called twice ran `fn` twice under plain Node. So `getCurrentUser` and `readMaintenance` read the current request each call in a test, and switching `asRequest` between calls switches the user |
| **A refusal from `requireRole` is a thrown error with `digest` `NEXT_REDIRECT;<push/replace>;<url>;307;`** | `redirect()` works outside Next and throws it; the role matrix reads the URL from the digest (`/billing`, `/login`, `/maintenance`). An allowed call with `{}` returns the Zod error instead |
| **Call Server Actions, not services, from a test that must also run on older code** | every action takes `input: unknown`; services changed shape (P7.1 made `voidEntry` take an object, P7.2 added client ids). Through the actions the same file ran on commits from before P7.1, and failed on the findings rather than on a signature |
| **`bills.bill_no` is an identity column** | `update bills set bill_no = bill_no` fails 428C9 ("cannot update identity column") before any trigger fires. To prove a trigger refuses, update `id = id` and check the SQLSTATE is 23001 (restrict_violation) |
| **Every financial table's trigger, as the database holds it** | `database-guarantees.test.ts` reads `pg_trigger` and compares with a table: 12 `forbid_change` (the hatch opens them), `audit_log` and `day_snapshot_history` `forbid_change_always`, `day_snapshots` `forbid_update` (DELETE allowed, 0009). A new append-only table must be added there |
| **A `UserError` may carry a `code`, and a Server Action's refusal passes it on** (P7.10) | `lib/errors.ts`, `failure()` in `lib/action-result.ts`: `{ ok: false, error, code? }`. For a refusal the screen answers with more than the message; the one so far is `slip-no-repeated` (`SLIP_NO_REPEATED`, `lib/offline/slip.ts`), which the billing screen turns into "save anyway" |
| **A slip number is looked for by `findSlipClash`** (P7.10) | `billing/queries.ts`: a bill not cancelled, not a reversal, same `slipKey` (upper case, no spaces — in SQL `upper(regexp_replace(book_no, '\s+', '', 'g'))`); a paper number on any day, a `T-` number on its own day; the bill being corrected left out. No index on `book_no`: a scan of bills with a book number, one per Save that has one |
| **Each browser's tag is `thisDevice()`** (P7.10) | IndexedDB `art-man-offline`, store `counters`, key `device`: `{ id: uuid, code: 3 letters }`, made once in one transaction, never cleared (sign-out included). `queue`/`queueClose` stamp it on every outbox item that has none |
| **Offline audit entries say which day, which item and which computer** (P7.10) | `after.offline` of `bill.create`, `folder.expense`/`folder.staff_advance` and `day.close` now holds `businessDate`, `clientId` and `device` besides `madeAt`/`madeBy`; a refusal's `after.sent` holds the whole request, device included. `offlineWorkOn` (`db/queries/offline-work.ts`) reads both — `coalesce(after->'offline', after->'sent')` — from a day before the earliest date asked, and ignores a malformed tag. Items from before P7.10 name no computer and are not counted |
| **The error card decides its words from two probes** (P7.11) | `loadFailureOf(online, database)` (`lib/load-failure.ts`): `useConnectivity` false → "offline"; `/api/health` 503 → "database"; anything else, a health answer it cannot read included → "screen". `databaseAnswers` asks once per error (effect keyed on the error object; the answer is kept with the error it was about, so a new error is asked afresh without a state reset in the effect). In `next dev` StrictMode asks twice, and the pane lists a 204 with no body as `ERR_ABORTED` |
| **`/api/health` needs a session cookie but no session** (P7.11) | The proxy sends a cookie-less request to /login, like every non-dotted path; the handler runs only `select 1` (5 s cap, `Promise.race`), so a database outage answers 503 rather than failing in `getSession` |
| **Two pushes in quick succession cancel the first CI run** | `concurrency: cancel-in-progress` (`ci.yml`). Found on P7.10: its "Lint, test, build" was cancelled by the claim commit for P7.11 pushed a minute later, and Deployable reported failure for that commit; the newer commit's run carried the same code and went green. Once Deployment Checks are on, only the newest commit is promoted, which is what is wanted — but read the newest run, not the one for the commit you care about |

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

**Probably outdated (2026-09-28):** Next 16 puts `next dev`'s output in `.next/dev`, apart from the
build's, and a `pnpm build` run while the user's dev server was up left it serving 200. Keep the
fix above in mind if it ever recurs, but do not expect it.

### 8.0c `next dev` serves a stale Tailwind bundle when only a `.tsx` changes

Cost most of an hour on P3.6. New utility classes were added to a component — `print:static`,
`print:translate-none` — and Tailwind generated **none of them**. The classes were on the element,
the file is scanned, and the page had been reloaded. The compiled stylesheet simply had not been
rebuilt: editing `globals.css` rebuilds it, editing a `.tsx` did not.

It is nasty because the symptom is a CSS rule that "does not apply", so you go looking in the
cascade rather than at the build. **Check that the class exists in the served CSS before debugging
why it lost:**

```js
// in the browser console, against the dev server
const href = document.querySelector("link[rel=stylesheet]").href;
(await (await fetch(href)).text()).includes("print\\:translate-none");
```

If it is false, touch `src/app/globals.css` and reload. `pnpm build` is not affected — a
production build scans everything.

### 8.0d Lightning CSS drops `translate` when `transform` is in the same rule

Also P3.6, and the reason the fix moved out of `globals.css` and onto the element.

Tailwind 4 centres a dialog with the **standalone `translate` property** (`-translate-x-1/2`), not
with `transform`. To undo that for printing, the obvious rule is:

```css
[data-slot="dialog-content"] { transform: none !important; translate: none !important; }
```

Lightning CSS folds those two into **one** `transform: translate3d(0,0,0) !important` and the
`translate` declaration never reaches the browser — so the dialog stays shifted by -50%/-50% and
the slip prints half off the sheet. Verified by reading the
compiled rule back out of `document.styleSheets`; dropping `transform: none` from the rule makes
`translate: none` survive.

The fix that does not depend on any of this: put the override on the element as a Tailwind
utility (`print:translate-none`). Utility against utility is ordered by Tailwind — measured, the
print variant lands at byte 65,219 of the stylesheet against 26,662 for the centring class — so it
cannot be folded away or lose the cascade.

### 8.0e A hidden Browser pane freezes the page, and the text tools do not say so

**This wasted well over an hour across two tasks. Read it before debugging anything in the
Browser pane.**

When the pane is not being displayed the page produces no frames, and with no frames:

- **a Suspense boundary never reveals its content.** After P4.6 added `loading.tsx`, `/overview`
  sat on the loading skeleton for thirty seconds in dev *and* in a production build. The content
  had arrived — it was sitting in `<div hidden id="S:0">` with the boundary still marked
  `<!--$~-->`. It looked exactly like a bug in the new file. **Taking a screenshot rendered a
  frame and the page completed instantly.**
- **CSS animations stay at frame zero**, so `getComputedStyle` reports mid-animation values that
  never advance, and measurements contradict each other. This is what made the P3.6 `translate`
  investigation (8.0d) so confusing.
- `requestAnimationFrame` never fires, so any script awaiting it times out.

What to trust when the pane is hidden: the DOM, `document.styleSheets`, selector matching,
`fetch`. What not to trust: anything that depends on the page having rendered. **If a page looks
stuck, take a screenshot before believing it.**

### 8.0f A hidden pane also stops React committing state — a dialog will not open

The other half of 8.0e, found on 2026-09-23. With the pane not drawing, clicking
a button that only sets React state (`setOpen(true)`) does **nothing visible and
nothing in the DOM**: no dialog appears, and querying for `[role="dialog"]`
returns null. It looks exactly like a broken component. The same click worked
immediately after a screenshot succeeded.

It also makes a Server Action look like it failed. After `revalidatePath`, the
screen still shows the old figures — the action had in fact run, which the dev
server log proves:

```
POST /customers 200
  └─ ƒ setRateAction({...}) in 2192ms
```

**Before doubting the code, check the server log and re-fetch the page**
(`await (await fetch(url)).text()`), which is served fresh and does not depend on
the pane rendering. A screenshot, retried once or twice, unfreezes it.

### 8.9 A screenshot of the Browser pane can be cropped, and lie about overflow

Found while checking P6.1 at 375px. The page looked as though it overflowed to
the right — a button cut off at the edge, a heading truncated mid-word — in two
screenshots in a row. Nothing was wrong: `document.documentElement.scrollWidth`
equalled `clientWidth`, no element's `right` passed the viewport, and the
button that looked cut ended at 298px of 375.

The pane had simply rendered a narrower frame than the emulated viewport. This
is a cousin of 8.0e: **the pane is a camera, not a measuring tape.** Before
changing a layout because a screenshot looks wrong, measure it:

```js
const vw = document.documentElement.clientWidth;
[...document.querySelectorAll("*")].filter(el => el.getBoundingClientRect().right > vw + 1);
```

An empty array and `scrollWidth === clientWidth` mean the layout is fine and
the picture is not.

### 8.10 A media query does not agree with `clientWidth`

Also P6.1, and it looked like a broken breakpoint. At an emulated 768px the
stacked-table rules did not apply, while `document.documentElement.clientWidth`
read **753**. Both are right: `clientWidth` excludes the scrollbar and a media
query does not. So `(width < 48rem)` was false at a real 768.

That is the behaviour that matches Tailwind's `md:`, which is what you want —
but if a breakpoint ever seems off by a scrollbar's width, this is why, and
`window.matchMedia("(width < 48rem)").matches` is the thing to ask.

### 8.11 A utility beats `.table-stacked` on a phone

Found 2026-09-25 (P6.5). The phone layout for tables — each row a card — is in
`globals.css` under `@layer components`. Tailwind's utilities sit in a later
layer, so they win **whatever the specificity**: a cell's `px-3.5 py-2.5` kept
its full padding on a phone and the cards came out loose, every line far from
the next. Put a stacked table's cell padding behind `md:` (`md:px-3.5 md:py-3`).
Fixed in all four: the Daily report (P6.5), Today's bills (P6.6), Daily folders and the Staff khata (P6.7). A new `.table-stacked` must pad its cells behind `md:` from the start.

### 8.12 Testing offline in the Browser pane: stop the server

Found 2026-09-26 (P2.2a). The pane has no "offline" switch, but stopping the `prod` preview
server is a faithful stand-in: every fetch to the origin fails at the network, exactly as it does
with the internet gone. Three things to know:

- test against `pnpm build` + the `prod` launch entry, never `next dev` — the worker is
  production only;
- the pane's `navigate` tool may **silently not navigate** to a server that is down; use
  `location.assign(url)` from `javascript_tool` instead;
- the connectivity store only re-probes on an `online` event while the page is **visible**, and
  a hidden pane is not (trap 8.0e). Take a screenshot first, or wait out the 20 s timer.

Afterwards, unregister the worker and delete its caches from the pane
(`navigator.serviceWorker.getRegistrations()`, `caches.keys()`), so it cannot outlive the test.

### 8.13 Simulating a lost connection: patch `window.fetch` in the page

Found 2026-09-28 (P3.15). Next calls the global `fetch` at call time for a Server Action, so
replacing `window.fetch` from `javascript_tool` reaches it. Two shapes were enough:

- **the answer lost:** call the real `fetch`, then throw `new TypeError("Failed to fetch")` — the
  server saves, the screen never hears;
- **never sent:** throw before calling it.

Recognise the action by its `next-action` request header, arm the patch for one call only, and
**reload the page afterwards** so nothing patched outlives the test. Stopping the server (8.12)
cannot produce the first case, which is the dangerous one.

### 8.14 "I signed in" may mean the person's Chrome, not the Browser pane

Cost three round trips on 2026-09-28. The pane is a separate browser with its own cookies; a
sign-in in Chrome does nothing for it. To tell which one someone used without asking again:
`session.user_agent` of the newest session — the pane's reads `Claude/<version> ... MSIX`,
Chrome's does not. If the pane is hidden, ask them to press **Ctrl+Shift+B** in the desktop app.

### 8.15 A browser extension in the counter's Chrome wraps `fetch`

Seen 2026-09-26 in the user's console: `frame_ant.js` (not ours — an extension, probably a
download manager's) sits in every `fetch` stack. It was in the stack when #32's answer was lost;
it was **not** shown to be the cause, and the P2.2a banner said the connection was down too. If
lost answers keep happening on one machine, try that browser without extensions (Incognito) before
suspecting the app.

### 8.16 Reaching a bill's "saved" path without saving a bill

Found 2026-09-28 (P3.16). With no dev database (9a), a real Save writes to the salon's books. The
billing screen's saved path (`afterSave`) can still be reached without one: mount the screen with
an existing bill's `client_id`, block the Save (8.13, "never sent"), and let the screen ask
`findSavedBillAction`. The server answers with that bill, and the screen does everything a Save
does except write.

- Read an id read-only: `select bill_no, client_id from bills where client_id is not null` (#33–#35
  have one, from P3.15).
- Patch `crypto.randomUUID` to return it, reach Billing **client-side** (click a nav link from
  another page; a reload drops the patch), and restore it once the screen is up. StrictMode calls
  the initializer twice; both calls got the id. React's fiber (`__reactFiber$…`, walk `.return` up
  to `BillingScreen`, then its hooks) shows which id the screen holds.
- Block by body, not by action id: throw for any `next-action` request whose body contains
  `"lines"`, and prove it first with a dry-run `fetch`. Count the bills before and after.

### 8.17 Testing the outbox by hand, and a button a hidden pane never disables

Found 2026-09-28 (P2.2c). Until P2.2d nothing puts a bill in the outbox, so a test writes one
itself: open `art-man-offline` **without a version** (`indexedDB.open(name)` — any version given
older than the live one fails), `add()` an `OutboxEntry` to the `outbox` store with no `seq` (the
store numbers it), then post `"changed"` on a **new** `BroadcastChannel("art-man-outbox")` — a raw
write announces nothing, and a channel never hears its own messages. The page's sync then sends it.
Ids for the entry come from the catalog copy in the same database (`catalog` / `current`).

- A made-up entry that the server will refuse (a closed `businessDate`, cash short of the total)
  writes nothing but audit rows; one it accepts is a real bill. Keep the accepted ones few.
- The sync calls the global `fetch` at call time, so trap 8.13's patch works on it too — make
  it throw for "network down", or return `new Response(..., { status: 401 })` for "signed out".
- **In a pane that is not drawing, `useTransition`'s `pending` may never reach the screen**, so a
  button disabled by it stays pressable and a second press is sent. That is how one test bill got
  two `bill.offline-discard` rows. Anything that must not happen twice needs a guard that does not
  wait for a render (a ref), and ideally a server that does it once anyway.

### 8.18 Testing offline billing: what cost time in P2.2d

Offline billing needs the service worker, so it is tested only against `pnpm build` + the `prod`
launch entry, going "offline" by stopping that preview server (8.12). Found on the way:

- **Signing in moves to Billing without loading a page**, so `PwaSetup` (which runs on page loads)
  had last asked for the offline page while signed out, was refused, and nothing was kept. Fixed:
  `CatalogSync` asks too, after every copy it saves. When checking, confirm the kept page is *this*
  build's: its HTML must name a script the current page loaded.
- **After a deploy that changes `sw.js`, the first ask reaches the old worker**, which ignores it.
  Fixed with a second ask on `controllerchange`.
- **The desktop app restarts a stopped preview server by itself** and may reset the pane's tabs.
  One survived a `pnpm build` and served the old build; `preview_list` showed it as a new server.
  Stop it and start `prod` again after every build.
- **A page loading at the moment the server stops arrives half-done** — the layout and
  `loading.tsx` — and stays on "Loading". With the internet really gone this happens too, so
  `OfflineWayOut` puts an "Open offline billing" link on the loading and error screens; F5 also
  reaches it, through the worker.
- **The pane lost its sign-in for `localhost:3000`** between sessions; the user signed in again. An
  assistant must not type a real password — ask (8.14).
- Hand-editing the copy's `savedAt` in IndexedDB is how the 12-hour limit was tested; put it back.

### 8.19 Testing offline folders and the register: what P2.2e learned

The same setup as 8.18. What was new:

- **A made-up item meant to be refused must really be refused.** A hand-written bill (8.17) was
  first given cash 250 + online 50 against a Rs 300 line — a payment that *adds up*, which the
  server would have saved as a real bill in the salon's books. It was caught before the server was
  started again. Before bringing the server back, read every made-up item and check it breaks a
  rule: a payment short of its lines, or a `businessDate` of a closed day.
- **To show a pending bill on the online register, cut only its route**: patch `window.fetch` to
  throw for `/api/offline/sync` (8.13), set the bill's `rejected` back to `null` in IndexedDB and
  post `"changed"` on a new `BroadcastChannel("art-man-outbox")`. It stays waiting while every page
  still loads. Restore `fetch` and post again, and it is sent.
- **A lost answer on the Folders form**: patch `fetch` to call the real one and then throw, for the
  one request whose body holds the test description — a Server Action's body is its arguments as
  JSON. `read_network_requests` with the request id shows the outbox's answer
  (`{"alreadySaved":true}`).
- **Reading the page too early looks like a failure.** Twice a check read the DOM right after a
  click — the Remove dialog still open, Billing's Needs attention not there — and a screenshot
  (8.0e, 8.0f) showed the screen had in fact moved on. Screenshot first, then read.
- **`find` locates a field by its placeholder** ("Tea, lunch", "500"), not by its label; the
  label's own ref cannot be typed into.
- **Clean up the pane afterwards** (8.12): unregister the worker and delete its caches.

### 8.20 Testing against a copy of live, so nothing is written to it

Found 2026-09-29 (P2.2f). A Day Close cannot be verified without closing a day, and on live that
would close the salon's open day for good. What worked instead — **no password, no Neon branch, and
the machine's own PostgreSQL service untouched**:

```bash
# PostgreSQL 16 and 18 are installed under C:/Program Files/PostgreSQL; use 18 (Neon runs 18.6).
PG="C:/Program Files/PostgreSQL/18/bin"; DATA="<scratchpad>/pgdata"
"$PG/initdb.exe" -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C
"$PG/pg_ctl.exe" -D "$DATA" -l "<scratchpad>/pg.log" -o "-p 5544 -c listen_addresses=127.0.0.1" start
pnpm db:backup                       # read-only; move the file out of backups/ into the scratchpad
"$PG/createdb.exe" -h 127.0.0.1 -p 5544 -U postgres artman_test
"$PG/pg_restore.exe" -h 127.0.0.1 -p 5544 -U postgres -d artman_test --no-owner --no-privileges <dump>
```

- **Start the app with the copy's URL in the environment** — it beats `.env.local` (section 7), and
  a local URL must have no `sslmode` (8.5). `.claude/launch.json` is tracked, so a temporary entry
  pointing at a launcher in the scratchpad (`node start-local.cjs`, which sets `DATABASE_URL` and
  runs `pnpm start`) must be taken out again before committing. `pg_ctl start` holds the shell: it
  goes to the background, which is fine.
- **Prove which database the server uses before anything writes.** Two checks agreed: its
  connections in the copy's `pg_stat_activity`, and a marker customer inserted only into the copy
  (`LOCAL TEST DB marker`) showing up in the catalog copy in IndexedDB.
- **The pane's sign-in works on the copy** — the session row came with the dump and the secret is
  the same — so no password is typed anywhere (8.14, 8.18).
- **The pane's IndexedDB and service worker belong to `localhost:3000`, whichever database is behind
  it.** Before switching back to live: the outbox empty, the catalog and day copies deleted (they
  name the copy's days), the worker unregistered and its caches deleted. A made-up item left in the
  outbox would be sent to live by the next page load.
- `verifyDayCode` (`db/day-code.ts`) runs against the copy with `DATABASE_URL=… npx tsx <script>`
  (an absolute import path to `src/db/day-code`) — it recomputes a closed day's code from its rows.
- Afterwards: `pg_ctl stop`, delete the data folder and the dump. It is the salon's whole book.
- **P3.4 added (2026-09-29):**
  - **The pane had no sign-in for `localhost:3000`.** A throwaway Owner was made **in the copy only** with
    a scratch script doing what `seed-developer.ts` does (`auth.$context`, `internalAdapter.createUser`
    and `linkAccount`), its random password written to a scratchpad file, never printed; it went with
    the copy. The script refused to run unless `DATABASE_URL` named `127.0.0.1:5544`.
  - **Days on the copy can be closed by a script:** `reviewClose({ attendance: {}, payouts: {}, counted: 0 })`
    gives `expected`, then `closeDay(user, { attendance: {}, payouts: {}, counted: expected, clientId: null })`
    and `startNextDay(user)`. About a second a day; a month took under a minute.
  - **A script in the scratchpad resolves the repo's own files by absolute path, but not a package by
    name** — `import "drizzle-orm"` there is `MODULE_NOT_FOUND`. Import what you need through repo files,
    or filter in JavaScript.
  - **A direct read of live from a scratch script was refused** by the session's permission mode (a
    production read). `pnpm db:check` is the read-back that works; read the SQL's effect on the copy.
- **P1.10 added (2026-09-30):**
  - **On Windows a scratch script's absolute imports must be `file:///C:/...` URLs** — a bare `C:/...`
    path fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Run it from the repo root with `npx tsx`, so the
    repo files' own `@/` imports resolve. A package can be reached the same way by its path
    (`file:///C:/Users/dell/Desktop/art-man/node_modules/drizzle-orm/index.js`); Node follows the
    pnpm symlink, so it is the same module the repo loads.
  - **To prove a bug in the code before a change, without touching the working tree**: `git show
    HEAD:<file>` into the scratchpad with its imports rewritten to file URLs (sed), then call it inside
    `db.transaction` and throw at the end, so the copy is left as it was. That is how the old
    `resettleDay` was shown reversing the month's salary lines.
  - **A developer account for the pane, in the copy only**: the scratch script that closes the days
    can make one (`internalAdapter.createUser` + `linkAccount`, a random password to a scratchpad file,
    deleted with the copy). The pane's cookie for `localhost:3000` is then that session; sign out
    before the copy goes.
  - **The pane put its tab back on `/` once** (a full `GET /billing`, not a click) between two steps,
    and the refs from `read_page` went with it. Navigate back and read the page again before acting.
- **P7.1 added (2026-09-30):**
  - **When a check needs only a few rows, a fresh local database beats a copy of live**: `createdb`,
    `pnpm db:migrate` with `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `CHECK_DATABASE_URL` all pointed at
    it (trap 8.24; print the host with the `node -e` line there first), then a scratch script that makes
    the accounts (`internalAdapter.createUser` + `linkAccount`, the PIN with `hashPin`), `openFirstDay`
    and the entries through the services. No `pnpm db:backup`, so no contact with live at all. One
    database per scenario that burns state (a PIN lock lasts 15 minutes and `audit_log` cannot be cleaned).
  - **A scratch script must be `.mts`** for top-level `await`; and a static `import { x } from
    "file:///…/src/db/schema/index.ts"` fails with "does not provide an export named" (the barrel's
    `export *` compiled to CommonJS). Import it dynamically, or `import * as S` and take `S.default ?? S`.
  - **Signing the pane in on a local database replaces its `localhost:3000` cookie.** Sign out with
    `POST /api/auth/sign-out` from the page when the pane will not draw (8.0e), and delete the catalog's
    `current` and `day` keys yourself — the sign-out button is what clears them, and it was not clicked.

### 8.21 `react-hooks/purity` blamed a `Date.now()` that had not changed

Found 2026-09-29 (P2.2f). Adding `{closedHereText(...)}` inline in `EntryForm`'s JSX made the lint
fail on the `Date.now()` inside `keep()` — an event handler's async function, untouched, fine the
day before. The React Compiler's analysis of the component changed; the fix was to render the text
through a component (`<ClosedHereNote>`) instead of calling the helper in the markup. If the purity
rule points at code that did not change, look at what was just added to the render.

### 8.22 Proving which database a server is on, before it writes anything

Found 2026-09-30 (P1.10). Trap 8.20 proves it with `pg_stat_activity` and a marker in the catalog
copy, but both need the server to have read something first — and the first thing a test does is sign
in, which writes a session and a `login.*` audit row to whichever database it is on. If that were
live, the throwaway account's failed sign-in would be in live's audit log for good.

A read that writes nothing: Better Auth's username plugin answers `POST /api/auth/is-username-available`
(`{"username": "…"}`) from the `user` table, and the P3.9 audit hook only records `/sign-in/*`. Make
the throwaway account in the copy first; the server is on the copy when that name comes back
`{"available": false}` and a name nobody has comes back `true`. Then `pg_stat_activity` on the copy
shows the app's connection as well.

### 8.23 Screenshots for the README

Made 2026-09-30. The Browser pane's screenshots are small JPEGs and freeze when it is hidden (8.0e),
so the README's come from **headless Edge driven over the DevTools protocol** from a plain Node
script — Node 24 has `WebSocket` and `fetch` built in, so nothing is installed:
`msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<scratch>`, then
`Emulation.setDeviceMetricsOverride` (1440×900, or 390×844 at 2× with `mobile: true`), sign in with a
`fetch` to `/api/auth/sign-in/username` from the page, `Page.navigate`, wait, `Page.captureScreenshot`.
A cart is filled by clicking the page's own buttons and setting controlled inputs through the native
value setter plus an `input`/`change` event.

The data is a **fresh local database** (migrations, then a scratch script), never a copy of live:
two months of bills, folder entries, closes and a month close entered through the app's own services
(`createBill`, `addEntry`, `closeDay`, `closeMonth`…), with fictional staff, customers and partners.
Let the Owner bank the drawer every few days and pay staff weekly, or the drawer grows to lakhs and
the month's "balance with business" goes negative — neither looks like a salon. As always, prove the
server is on that database before signing in (8.22). Delete the database and the browser profile
afterwards. The demo seed is deliberately not in the repo: P1.9 keeps one seed, the developer's.

### 8.24 Overriding `DATABASE_URL` alone did not keep migrations or backups off live — fixed in P7.6

Found 2026-09-30 (QA audit). `drizzle.config.ts` and `scripts/backup.ts` use
`DATABASE_URL_UNPOOLED || DATABASE_URL`, and `.env.local` has `DATABASE_URL_UNPOOLED` set to live's
direct string. So `DATABASE_URL=<local> pnpm db:migrate` migrates **live**, and the same for
`db:backup`. The app and the seed only read `DATABASE_URL`, which is why the pattern looked safe.

**Fixed 2026-10-01 (P7.6):** a `DATABASE_URL` named on the command line is now used whole, and
`pnpm db:migrate` prints its target and refuses a non-local one without `--live`. Overriding all three
is still harmless, and `db:check` still reads `CHECK_DATABASE_URL` first:

```bash
export DATABASE_URL=postgres://postgres@127.0.0.1:5544/x DATABASE_URL_UNPOOLED=$DATABASE_URL CHECK_DATABASE_URL=$DATABASE_URL
```

Check it without connecting: `node -e 'process.loadEnvFile(".env.local"); console.log(new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL).host)'`.

### 8.25 Git Bash on Windows drops `TZ`

Found 2026-09-30. `TZ=America/Los_Angeles node …` in Git Bash reaches Node as **undefined** (the MSYS
runtime treats `TZ` itself), so a "different time zone" run silently uses the machine's. Set it from
Node instead: `execFileSync(process.execPath, [...], { env: { ...process.env, TZ } })`, and print
`new Date(0).toString()` in the child to prove it.

### 8.26 Scripts that sign in trip the sign-in rate limit

Found 2026-09-30. A production build allowed 3 sign-ins per 10 s per client (fact in section 7). A test
script that signs in as three roles back to back gets a 429 on the third and carries on with no cookie —
every check after it then looks like a refusal. Wait 11 s after a 429 and retry, and check the cookie
is not empty.

**Since P7.12** the limit is 10 a minute per address, and a username is locked for 15 minutes after 5
wrong passwords — a test that tries wrong passwords on purpose locks its account for the rest of the run;
use a username of its own, or reset the password (a reset ends the lock).

### 8.27 Calling a Server Action directly, for a test

Found 2026-09-30. `.next/server/server-reference-manifest.json` → `node[<id>]` has `exportedName` and
the pages (`workers`) that carry the action. POST to one of those pages with headers
`next-action: <id>`, `content-type: text/plain;charset=UTF-8`, `origin: <the site>` and the session
cookie; the body is `JSON.stringify([input])`. The answer is RSC text: the `ActionResult` is on the line
starting `1:`. A `requireRole` refusal comes back as HTTP 200 with `x-action-redirect: /billing;push`.
The id is stable while the file is unchanged (section 7), but read it from the manifest each time.

### 8.28 A race test on a local database needs the pool opened first

Found 2026-09-30 (P7.2). HEAD's `addRepayment`, called twice at once against a local copy, refused the
second installment four runs in a row — the race the QA audit had reproduced seemed not to exist. The pool
had one open connection: the first call took it and finished its reads, insert and commit in a few
milliseconds while the second was still connecting. Open the pool's five connections first
(`Promise.all` of five `select pg_sleep(0.05)`), and the same call let both installments in every time.
**A race test that finds nothing proves nothing until it has been shown to find the bug** — run it against
the old code, or against the database without the constraint, before trusting a clean result.

### 8.29 Testing typed input in the pane: what P7.5 learned

Found 2026-10-01. `computer` `type` inserts the whole string in one input event — a box that refuses
bad text rejects it whole, which looks like "typing does nothing". Press keys one by one with `key`
("1 1 1 0 . 5"); the key name `period` typed nothing, a literal `.` works. A click into a box that
already has focus fires no `focus`, so select-on-focus does not run again — click elsewhere first. The
pane also moved the tab from Day close to Billing by itself once mid-test (as in 8.20); navigate back and
take a screenshot before reading the DOM, since the wizard only draws after hydration (8.0e).

A Bash heredoc of ~160 lines holding a Python edit script was cut short ("here-document … delimited by
end-of-file") and nothing was written. Write long edit scripts to a scratchpad file and run that.

### 8.30 GitHub's deployments API runs out after an hour of polling

Found 2026-10-01 (P7.6). Section 7b's check — `api.github.com/repos/Sakib543/art-man/deployments` — is
unauthenticated: 60 requests an hour per IP. Polling it every 5 s after each push used the hour up, and
the answers came back empty (`API rate limit exceeded`, read with `curl …/rate_limit`). `gh` is not
installed on this machine. Poll every 20–30 s, stop at the first answer, and when the change does not
touch the app (scripts, docs) a `GET /login` returning 200 is enough.

### 8.31 pnpm 12 refuses a release that is only hours old

Found 2026-10-01 (P7.7). `pnpm add next@16.3.8` — published four hours before — did not fail: it wrote a
`minimumReleaseAgeExclude` list for the package and its dependencies into `pnpm-workspace.yaml` and
installed it. That is pnpm's guard against a freshly published (possibly hijacked) release being waved
through. Do not commit such a list: revert the three files and ask for a range instead
(`pnpm add next@~16.3.6`), and pnpm picks the newest release old enough to pass. Check dates with
`pnpm view <package> time --json`.

### 8.32 `git stash push -- <paths>` removed an unrelated tracked file

Found 2026-10-01 (P7.8). Stashing three changed files to run a scenario on HEAD's code left
`docs/art-saloon.html` (4,265 lines, tracked, unchanged) **deleted** from the working tree; `git status`
showed ` D docs/art-saloon.html` right after the stash, and the pop did not bring it back. It was restored
with `git checkout -- docs/art-saloon.html`. Always run `git status` after a stash and a pop. To run old
code, copying the old files into the scratchpad (`git show HEAD:<file>`, trap 8.20) touches nothing.

### 8.33 A test that expects a refusal can pass for the wrong reason

Found 2026-10-01 (P7.9). The known-gap test "a session-level SET does not open the tables" was written as
`it.fails` and passed — but its `update bills set bill_no = bill_no` failed with 428C9 (an identity column),
not because of the gap. Any error made it "fail" as expected. Assert the SQLSTATE (23001 for the triggers),
and take `.fails` off once to read the real failure — it must be the gap itself ("expected '23001', received
'ok'"). The same goes for any test of a refusal: check what refused it.

### 8.34 Running the test suite against an older commit

Found 2026-10-01 (P7.9) — how the suite was shown to catch each QA finding on the code before its fix:

- `git worktree add --detach .p79-old-<sha> <sha>` **inside the repo folder**, so module resolution walks up
  to the repo's own `node_modules` — no install, and no junction (a `git worktree remove` might follow one
  into the real `node_modules`). Copy `tests/`, `vitest.integration.config.mts` and, before P7.6,
  `src/lib/db-target.ts` in.
- Run `node <repo>/node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts` from the
  worktree. `npx vitest` there finds the worktree's own `package.json` and no `node_modules`, and may try to
  download.
- Before P7.8 there is no `checkDayCodes`: append a shim that runs the old `verifyDayCode` per closed day.
- `git worktree remove --force` and `git worktree prune` afterwards, before any lint or build: the folder
  is inside the repo, so ESLint and `tsc` would read it.

The script used is not kept in the repo; the recipe is here.

### 8.35 A backslash in a Drizzle `sql` template is dropped

Found 2026-10-01 (P7.10). `regexp_replace(x, '\s+', '', 'g')` written inside Drizzle's `sql` template sent
the pattern `s+`: a tagged template gets the *cooked* strings, and in a template literal `\s` is just `s`. Write `\\s` in the source to
send `\s`. A Python script that writes such a line needs `\\\\s` (or a raw string) for the same reason — the
first edit of P7.10 went wrong twice that way, which is why `findSlipClash` carries a comment.

### 8.36 A pane screenshot taken just after a click can show the page from before it

Found 2026-10-01 (P7.10). After "save anyway" was clicked, two screenshots in a row still showed the warning
and the unsaved cart, while the bill was already in the database and `get_page_text` showed the next bill's
empty form and the new row. Check the DOM or the database before concluding a click did nothing; scroll with
`computer` `scroll` rather than `scrollIntoView` from JavaScript when the screenshot is what is wanted.

**P7.13:** with the pane not drawing at all ("Could not get the tab ready for input"), a `form_input` into Day
close's count box was followed by the page going to `/billing` — nothing on that screen goes there, and the
same steps done from `javascript_tool` (the native `value` setter, an `input` event, then `.click()` on the
button) went through, twice. Most likely a click at coordinates from a page that was never laid out. With a pane
that does not draw, fill React inputs and press buttons from JavaScript, and check where the page is after.

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

### 9a. `.env.local` IS the live database. There is no separate dev database.

**Measured on 2026-09-22, after two sessions of assuming the opposite.** Read this before touching
anything.

How it was proved, because a belief this consequential should not rest on inference: a throwaway
account was created in the database `.env.local` points at, the **live site** at
`https://art-man-drab.vercel.app` was asked to sign in with it, and it returned **200**. The account
was deleted in the same run. A live site can only accept an account that exists in its own database.

Supporting facts, all checked the same day:

- the Neon account holds **one project, `art-man-dev`, with one branch, `production`** — Neon names
  the default branch that, it does not mean live;
- `pnpm db:check` against `.env.local` reports **16 migrations, `user.active` present, 3 accounts**,
  and the live site's sign-in agrees.

**What this overturns.** This file previously said the live database was unreachable from here, that
its migration state was unknown ("anywhere from `0000` to `0012`"), and that each developer had
their own database. For *this* developer that last one is wrong: the Vercel project's
`DATABASE_URL` points at this very Neon project.

**What follows, and it is not comfortable:**

- **Migrations are already applied to live.** `0013`, `0014` and `0015` went on when they were run
  here. Nothing is owed.
- **Every verification run today wrote to the live database.** Bills #17, #18 and #19 on 24 Sep, and
  the throwaway accounts for P3.6, P4.6 and P1.2, were all created on live. The accounts were
  deleted; the bills cannot be, because bills are append-only. They are harmless *today* only
  because the whole database is still sample data and the salon is not using it yet.
- **"Reopen or reseed freely, none of it is real data" — the advice elsewhere in this file — stops
  being true the day the trial starts.** From that day, this machine is pointed at production and
  must be treated that way.

**The thing to actually fix:** get a separate database for development, so verifying a feature stops
meaning writing to the salon's books. A second Neon branch costs nothing and takes a minute:
branch `production`, put the new branch's string in `.env.local`, and leave Vercel pointing at
`production`. Do it before the trial starts, not after.

**Deferred by the user, 2026-09-28:** development stays on this database until the move to a VPS
(P5.3), when a new one is made. See section 9, "Owed by the user".

**All three passwords were reset on 2026-09-23** and the user has them. They
had been lost: the ones printed during seeding were gone, both seed scripts
skip an account that already exists, and `/developer/passwords` and Settings
both need you to be signed in already — so every documented recovery path was
closed at once.

What opened it was a throwaway script doing what `seed-users.ts` does for a new
account: look the row up, then
`ctx.internalAdapter.updatePassword(id, await ctx.password.hash(next))` through
`auth.$context`. Two things to know if it is ever needed again:

- **it writes to the live database**, because `.env.local` is the live database
  (section 9a), so a reset ends that account's sessions everywhere;
- **an assistant session may be refused it outright.** This one was, twice — as
  a credential-store write, and again when it tried to grant itself the
  permission. Write the script, and have the user run it.

**P1.7 narrowed the hole it came from.** The developer can now set their own
password from `/developer/passwords`, which they could not before. That helps a
developer who is *signed in* and has forgotten it; it does nothing for one who
is signed out, which is still the script above.

**Owed by the user:**
- [x] **Apply `0013`, `0014` and `0015` to the live database** — already done, by accident, and the
  reason is the single most important thing on this page. See 9a.
- [x] **Rotate the Neon database password** — done on 2026-09-22.
- [x] **New connection string in `.env.local`** — done on 2026-09-22. The database works again.
- [ ] **Get access to the Vercel project** — still in the other developer's account, re-confirmed
  2026-09-22. The URL is now known (`https://art-man-drab.vercel.app`) and the live database is
  connected, so what is missing is narrower than it was: the **environment variables cannot be
  read or changed**, and the **live connection string** is needed to apply `0013`, `0014` and now
  `0015`.
  **Vercel's free Hobby plan has no collaborators**, so being "added" is not possible on it — the
  realistic route is **Transfer Project** (Project Settings → General), or a paid Team. Ask them
  for the live Neon **direct connection string** as well; that alone unblocks migrations even
  before the project moves.

  **This is no longer only about convenience.** Until P1.2 was built, every unapplied migration was
  an index and nothing needed it, so the access problem cost nothing. `0015` changed that: the code
  reads `user.active` on every request, so from now on the deploy and the database have to move
  together, and only the holder of that string can move the database. **Nothing else should be
  built on a schema change until this is resolved.**
- [ ] **Switch on Vercel's Deployment Checks, waiting on "Deployable"** (P7.9, 2026-10-01) — three clicks in
  the Vercel project, by whoever holds it: `docs/DEPLOY_VERCEL.md` 0.2. Until then a push deploys whatever
  CI says, so look at the run before saying a change is live. Available on every plan, Hobby included.

- [x] ~~**Run one restore, into a throwaway Neon branch**~~ — **not needed (the user,
  2026-09-29).** Two restores of a fresh backup were run that day into a throwaway
  local PostgreSQL 18.4 (trap 8.20; for P2.2f's and P3.4's testing), cleanly, and the
  app ran on both. Asked whether to add one into Neon — which needs the Neon account,
  by a `neonctl` sign-in or a branch made by hand — the user said the local ones are
  enough. P3.7 is closed on them; `docs/BACKUP.md` records how. (Listed here since
  2026-09-23, when no restore had been run at all.)
- [ ] **A second Neon branch for development — deferred by the user, 2026-09-28,
  until the move to a VPS (P5.3), when a new database is made.** Until then P2.2c–f
  are built against this database, and every test write stays in it for good:
  bills, khata and `audit_log` are append-only, and a test bill on the open day
  counts in that day's totals. So keep test bills few, on `Test customer …`
  names, record each in the item's backlog entry, and prefer checks that write
  nothing (trap 8.16). **Better since 2026-09-29: test against a throwaway local
  copy of live (trap 8.20)** — P2.2f closed four days that way and wrote nothing
  to live. If the trial, or P5.3's `pg_dump`, starts from this
  database, those rows go with it. (History: on 2026-09-23 a verification wrote
  a bonus, a special rate and four throwaway accounts here; the accounts and the
  rate were cleaned up, the khata line and the audit rows cannot be.)
- [ ] **Decide what happens to the sample data before the trial.** The live
  database holds 19 sample bills, 3 business days, 31 khata lines and Neon's
  leftover `playing_with_neon` table. Bills cannot be deleted by the app, and
  `audit_log` cannot be cleaned by anything, so a clean start means a **fresh
  database**: migrate, `db:seed:developer`, then as the developer create the
  Owner and the Manager (Users) and the Owner's PIN (Passwords), then enter the
  real services, staff and partners from the screens. There is no other seed.
  The user has said this will be done when the site goes live (2026-09-23).

**Questions blocking work:**
0. ~~**A bill edited in a closed month leaves that month's frozen report wrong.**~~ **Answered
   2026-09-29 by the client: recalculate it** — built 2026-09-30 as backlog P1.10. The question as it was: `month_closes`
   keeps the report and the partners' shares as they were at close, and P1.6 does not recalculate
   them — the partners may already have been paid against those figures. Ask the client what they
   want: leave the frozen record alone (today's behaviour, with a red warning on screen), or
   recalculate it. Not urgent: no month has been closed yet.
   **Since P3.4 (2026-09-29)** there is a third way: record the sale's difference as an adjustment in
   the open month. But the developer's edit settles the day's khata again by itself, so a staff
   adjustment on top would count the commission twice — only the sale belongs in it.
1. ~~**May the Manager use the Customers screen?**~~ **Answered 2026-09-29: no — the Owner alone,
   names and numbers included.** Nothing changes. The question as it was: It is Owner-only today (P3.2),
   because a special rate is a price and spec §10.4 keeps prices away from the
   counter. But that also stops a Manager fixing a customer's name, which §11
   does not require. Split the two, or leave it?
1. **Who can let us into the Vercel project?** It exists and is connected to this repo, but it is
   in the other developer's account (answered 2026-09-22). Blocks P5.1 until access is granted.
2. ~~Can Day Close happen offline?~~ **Answered 2026-09-26: yes.** See section 6.
3. ~~What bill number goes on an offline receipt?~~ **Answered 2026-09-26: a temporary `T-5` is
   fine.** See section 6.

~~**Before P2.2c**: a separate dev Neon branch (9a).~~ **Decided 2026-09-28: not first.** The user
chose to build P2.2c–f against this database and make a new one at the VPS move. The cost, and how
to keep it small, is under "Owed by the user" above.

4. ~~**Should the offline copy hold every customer, or only those with a special rate?**~~
   **Answered 2026-09-29 by the user: every customer** (P2.2d). The cost, accepted: every
   customer's name and number sits in the IndexedDB of whichever browser signs in, until sign-out
   clears it. The copy is never cached by the network (`no-store`).
5. **Four questions for the client from the QA audit (2026-09-30)**, written up in `docs/BACKLOG.md`,
   "Still to ask" 3–6: does cash the Owner adds offset what "reached the Owner" (QA-09); a salaried
   karigar who leaves mid-month — full, part or no salary (QA-11); will more than one device ever
   bill offline on one day (QA-37); is half-up commission rounding per day the policy (QA-19). None
   blocks P7.1–P7.9.

**Answered:**
- **Does a Vercel project already exist?** Yes (2026-09-22) — connected to this same repo, but
  owned by the other developer's Vercel account. See the action above and section 2 rule 7.
- **Must an edited bill keep its receipt number?** No (2026-09-22). That answer chose option B for
  P1.5: fold the rows in the view only, leave the append-only guarantee alone.
- **Should the Daily report mark a bill as edited?** Yes — badge plus a link to the previous
  version (2026-09-22). Recorded in section 6.
- ~~**Each developer has their own database** (confirmed 2026-09-22).~~ **Wrong, corrected the same
  day.** The other developer may well have their own; *this* working copy does not — `.env.local`
  is the live database the deployed site uses. Proved, not inferred: see section 9a. The
  shared-file migration conflict in section 8.1 still applies either way — that one is about
  `drizzle/meta/_journal.json` in git, not about the databases.
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
  P3.6  Receipt printing                                DONE 2026-09-22
  P4.6  Error and loading screens                       DONE 2026-09-22
  P4.7  CI on every push                                DONE 2026-09-22
  P1.2  Users screen                                    DONE 2026-09-22
  P4.9  Index the financial tables                      DONE 2026-09-22
  P4.10 Staff khata stops reading the whole table       DONE 2026-09-22
  P3.9  Audit failed logins                            DONE 2026-09-23
  P3.1  Give a bonus                                   DONE 2026-09-23
  P3.2  Customers screen + special rates               DONE 2026-09-23
  P3.7  Backup + restore (local; the user accepted it) DONE  2026-09-29
  P4.2 · P4.4 · P4.5 · P4.8  Cleanup                   DONE 2026-09-23
  P4.1  One shape per feature, checked by a test      DONE 2026-09-23
  P4.3  features/auth merged into features/account    DONE 2026-09-23
  P4 is now complete.
  P3.10 Discount on a bill (client request)           DONE 2026-09-23
  P3.11 A service can be priced in a range              DONE 2026-09-23
  P6.1  Design system + responsive shell               DONE 2026-09-23
  P1.7  The developer can reset their own password     DONE 2026-09-23
  P1.8  Developer-only password resets · the eye · username DONE 2026-09-23
  P6.2  The salon's real logo, everywhere              DONE 2026-09-23
  P1.9  One seed script, developer only                DONE 2026-09-25
  P6.3  Tidy the login page after 5313fc3              DONE 2026-09-25
  P4.11 db:check counts migrations against the repo    DONE 2026-09-25
  P6.4  Register inside Daily report, no quick-add     DONE 2026-09-25
  P6.5  A calmer Daily report                          DONE 2026-09-25
  P6.6  Today's bills, as calm as the Daily report     DONE 2026-09-25
  P3.12 An "Other" line on a bill                      DONE 2026-09-25
  P3.13 Re-opening a discounted bill discounts twice   DONE 2026-09-25
  P3.14 A corrected bill keeps its deals' split       DONE 2026-09-25
  P6.7  Folders and Staff khata tables on a phone     DONE 2026-09-26
  P6.8  Login footer · BrandLockup · dark mode gone   DONE 2026-09-26
  P2.2a PWA foundation (started early, at the user's request) DONE 2026-09-26
  P3.15 A lost answer never leaves a bill in doubt        DONE 2026-09-28
  P2.2b Catalog copy in IndexedDB                          DONE 2026-09-28
  P3.16 The customer box starts empty after a save        DONE 2026-09-28
  P2.2c Outbox + sync endpoint (no migration)             DONE 2026-09-28
  P2.2d Billing offline: T- receipts, the offline page      DONE 2026-09-29
  P2.2e Folders offline, the day's copy, the register      DONE 2026-09-29
  P2.2f Day Close offline, the security code on sync       DONE 2026-09-29 — P2.2 complete
  P3.4  Adjustment for a closed month (migration 0020)       DONE 2026-09-29
  P3.3  Staff salary slip, a PDF to download                  DONE 2026-09-29
  P3.5  Alert on 3+ cancellations                             REMOVED 2026-09-29 (the client)
  P1.10 A developer's closed-month edit recalculates it        DONE 2026-09-30 (the client's decision of 2026-09-29)

STAGE 3b — before the trial starts, and none of it is code
  1. ~~One restore, into a throwaway Neon branch~~ — not needed: the user accepted the local restores (2026-09-29)
  2. ~~A separate Neon branch for development~~ — deferred to the VPS move (the user, 2026-09-28)
  3. A clean database for the trial, and the real services/staff/partners in it
  4. Vercel access (P5.1)

STAGE 3c — before the trial, and this is code (the QA audit, 2026-09-30; backlog P7)
  P7.1  Owner cash: cancelling it needs the Owner's PIN                 DONE 2026-09-30
  P7.2  One reversal per cancellation, in the database · repayments locked   DONE 2026-09-30 (migration 0021)
  P7.3  Re-settle a closed day with that day's pay and attendance       DONE 2026-09-30 (migration 0022)
  P7.4  Partner shares: one check; Partners never crashes            DONE 2026-09-30
  P7.5  Day close payouts and money fields: no silent typos           DONE 2026-10-01
  P7.6  Scripts never reach live by accident                            DONE 2026-10-01
  P7.7  Next.js 16.3.6 (went to 16.3.7)                                DONE 2026-10-01
  P7.8  Security code: fixed line order and a Verify screen          DONE 2026-10-01
  P7.8b Security code: a copy outside the database (QA-26)             after the trial starts
  P7.9  Integration tests on a real database, and a CI gate          DONE 2026-10-01 (the gate waits on Vercel access)
  Until P7.8b: the Owner writes each day's security code on paper, and compares on Security codes.
  P7.10 Slip numbers never collide unnoticed; a second computer is named        DONE 2026-10-01
  P7.11 The error screen stops blaming the database                         DONE 2026-10-01
  P7.12 A sign-in rate limit that holds                                      DONE 2026-10-01
  P7.13 The offline day copy gives the Manager only what a close needs      DONE 2026-10-01
  P7.14 Database hardening (migration 0023)                                 DONE 2026-10-01 (the app's own role waits on Vercel access)
  P7.15 Staff khata one month at a time                                     DONE 2026-10-01
  P7.16 README and HANDOFF statements that are not so                      DONE 2026-10-01
  P7.17–P7.18 follow; see the backlog.

STAGE 4 — after the trial
  P2.2  Offline PWA + sync — DONE 2026-09-29, all six parts (P2.2a–f): billing, Daily
        folders, the register and Day close work offline. Starting the next day still
        needs the internet (a P2.2f decision). Built against this database (the user,
        2026-09-28); P2.2f verified against a local copy of it instead (trap 8.20)
  P3    Bonus, special rates screen, staff receipt, printing, alerts
  P5.3  Move to a VPS + carry trial data over with pg_dump
```

P1.0 was done before P0.2 because both touch `day-close`; the reopen work now lands on code with
the PIN already removed.

Offline comes after the trial because the trial's purpose is to prove the **accounting** is correct
(spec Phase 1: run in parallel with the paper register, 7 straight days with a difference of 0).
The paper bill book (P2.1) covers outages until then.

**P4, P6.1, P2.2, P3.3, P3.4, P3.7 and P1.10 are finished; P3.5 was removed.** P1.10 was the last
planned item; **the QA audit of 2026-09-30 added P7.1–P7.18, and P7.1–P7.9 came before the trial**
(STAGE 3c) — **all nine are done (2026-10-01)**, the audit's condition for the parallel-run trial; what
is left of it is outside the code: Vercel's Deployment Checks on Deployable (section 9), and the Owner
noting each night's security code until P7.8b. Besides them: the items in STAGE 3b and the deployment items P5.1 and P5.3. (P3.7 was closed on the local restores — the user,
2026-09-29.) (Dark mode was removed outright in P6.8.) Nothing in the project sends anything, and
by the client's decision nothing will: no WhatsApp, no SMS.
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
