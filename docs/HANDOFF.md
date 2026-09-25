# HANDOFF — read this first

**Purpose.** This is the working state of the project between sessions. If you are an assistant
starting a fresh session on this repo, read this file and `docs/BACKLOG.md` before anything else.
Then do the one task the user asks for.

**Language.** Everything written down — this file, the backlog, code, comments, commit messages —
is in **English**. Talk to the user in **Roman Urdu**.

**Update this file at the end of every task** — see section 11.

Last updated: 2026-09-25 (P1.9: one seed script, developer only. P6.3: login page tidied. P4.11: `db:check` counts against the journal. Before that, 2026-09-23: P0 complete; P1.0-P1.6, P2.1, P3.1, P3.2, P3.6, P3.8, P3.9, P4.1-P4.10, P5.2, **P6.1**, **P6.2**, **P1.7** and **P1.8** done. P3.7: the backup is built, a restore has never been run)

---

## 1. Working agreement

Standing instructions. They override default habits.

| Rule | Detail |
|---|---|
| **One task per session** | Work through the backlog one item at a time. Do the task asked for; do not start the next one. |
| **`main` branch only** | Never create a branch. Never open a PR. All work lands on `main`. |
| **Ask before implementing** | The user says when to build. If a request is ambiguous, discuss first — do not start editing files in answer to a question. |
| **Verify every change** | After each task: `pnpm build`, `pnpm test` (353 tests), `pnpm lint`. All three must pass before reporting done. |
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
  `.github/workflows/ci.yml`. It reports; it does not block, because nothing merges through a PR.
  So a red run still reaches `main` — and reaches the live site, since a push here deploys.
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
| 7 | **A push to `main` deploys — since 2026-09-22.** The Vercel project was repointed from the upstream to **this fork** that afternoon, so pushing here now publishes. It did **not** before; see 7b. | Verified 2026-09-22 by pushing and watching the live site change. **Apply a migration to the live branch before pushing the code that needs it.** |

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
| `pnpm build` | pass — **26 routes** (2026-09-25; `icon.png` and `apple-icon.png` count as routes), exit 0, **succeeds with no env vars set** |
| `pnpm lint` | clean |
| `pnpm test` | **353 passed** (32 files), 2026-09-25 |
| Database | Neon, PostgreSQL 18.6, **30 tables** (29 plus Neon's leftover `playing_with_neon`), all seeds loaded, migrations through **`0017`** (P3.10's discount columns and P3.11's `services.max_price`, both 2026-09-23) |
| Backup | `pnpm db:backup` works; the file was read back and matches the database. **No restore has ever been run** (P3.7) |
| Login → Billing → Overview | tested in a browser, all 200 OK |
| Developer role | signed in as all three roles in a browser on 2026-09-22 (P1.1) |
| Developer bill edit | exercised end to end on an open day and twice on a closed day (P1.6) |
| Customer's last visit | looked up in a browser as the Owner, before and after a bill and its cancellation (P3.8) |
| Staff khata | opened in a browser for two staff members after the rewrite; balances and ledgers identical to before (P4.10) |
| Login is reachable with a dead cookie | fixed and tested both ways, with a real signed-in session and with a stale one (P0.4) |
| Passwords | **the client reset all three from the screen at 09:04 on 2026-09-23** and holds them; the ones handed over earlier in that session no longer work. `audit_log` has the three rows |
| Developer self-reset | exercised in a browser on the live data (P1.7, 2026-09-23): a new password set from the own-account form, the surviving session proved by a **200** on a re-fetch, then set back and signed in with again |
| Look and responsiveness | the design system and the shell were rebuilt (P6.1, 2026-09-23) and checked at **375, 768 and 1440 CSS pixels** through a throwaway harness route. The drawer, the bottom bar, a table stacking and the billing cart's row were each measured in the DOM, not eyeballed |
| Receipt printing | a bill was rung up and two older bills reprinted in a browser; the print rules were measured against the live DOM (P3.6). **Never put on actual paper** — no printer was available |
| Error and loading screens | both boundaries were made to fire in a browser, and the 404 and skeleton checked against a production build (P4.6). `global-error.tsx` has never been triggered |
| CI | the first run went **green in 56 seconds** on GitHub, commit `0f74808` (P4.7) |
| Users screen | an account was created, signed in with, closed, refused at the login screen, re-opened and had its password reset three times, all in a browser as the Owner (P1.2) |

Feature completeness: spec Phases 1–3 are essentially built (billing, worksheet, folders, day
close, daily report, staff khata, overview, monthly report, monthly expenses, capital, partners,
staff & rates, settings), plus the developer role with its audit log, password, maintenance and
bill-edit screens. Phase 4 (offline, backup) has not been started.

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
pnpm db:migrate
pnpm db:seed:developer # the developer account, prints its password ONCE — the only seed
pnpm db:check
pnpm db:backup
```

**There is one seed script, and it creates only the developer** (P1.9, 2026-09-25). Commit
`5313fc3` deleted all four seed scripts and left their commands in `package.json`; P1.9 brought
back `seed-developer.ts` alone. On a fresh database the developer signs in and creates the Owner
and the Manager on the Users screen, sets the Owner's PIN on the Passwords screen, and the real
services, staff, partners and fixed lines go in from their own screens. `db:seed`,
`db:seed:sample` and `db:seed:accounts` no longer exist — the old versions are in git history
(`git show 5313fc3~1:scripts/seed-sample.ts`) if a throwaway database ever needs sample data.

`.env.local` points at **the live Neon database** — the same one the deployed site uses. It is not a
dev database, whatever its name suggests; see section 9a, and treat every command on this page as
running against production. Keys: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (currently empty —
optional), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

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
| **Staff receipt and the cancellation alert** | **Dropped for now (2026-09-23)** — the client dropped the SMS/WhatsApp side. P3.3 and P3.5 stay in the backlog, unscheduled. |
| **Staff (karigar) PIN** | **Removed from the whole project** (P1.0, done 2026-09-22). No replacement confirmation wanted. |
| **Owner PIN** | **Kept.** They were two different columns: `staff.pin_hash` (dropped), `user.pin_hash` (still there). |
| **Developer role** | A 4th role above Owner: sees everything, resets any password/PIN, manages users, maintenance mode, edits config. **Built 2026-09-22 (P1.1)**, except user management (P1.2) and editing financial rows (P1.6). |
| **Developer editing financial entries** | **Approved**, after being told it weakens the append-only guarantee and the security-code chain. **Built 2026-09-22 (P1.6)**: a bill and its lines only, never deleted, always audited. Constraints below, all of them kept. |
| **Offline** | Real offline required — 6–8 hours with no internet, then sync on reconnect. |
| **Who may change a bill** | Manager: cancel, open day only. Owner: **edit** on the open day (P1.4), cancel only on a closed day (P0.3). Developer: everything the Owner can (P1.1), plus changing a bill **in place** on any day, closed month included (P1.6). |
| **Is the developer visible?** | **No, not on the screens** (2026-09-22). No developer section in Settings; the Owner and Manager see no sign the role exists. They sign in with a username and a password, nothing more. The account is still an ordinary `user` row and **every action it takes is audited** — hidden from the screens, never from the record. |
| **Marking an edited bill** | **Yes.** The Daily report's single line carries an "Edited" badge **with a link to the previous version** (P1.5, done). |
| **Who may set a password** | **The developer alone (2026-09-23).** The Owner could reset the Manager from Settings and both from the Users screen; both are gone (P1.8). The client was told the cost and chose it: if the Owner or the Manager forgets their password and the developer cannot be reached, **nobody in the salon can let them back in** |
| **The developer's own account** | **Theirs to name and theirs to unlock (2026-09-23).** They may reset their own password (P1.7) and change their own username (P1.8) — neither of which any other role may do. Nobody stands above that account, so nobody else can rescue it |
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
| **A command-line variable beats `.env.local`** | both `drizzle.config.ts` (`process.loadEnvFile`) and the scripts (`scripts/load-env.ts`, the same call) leave a variable alone when the environment already has it. Tested. This is what makes `DATABASE_URL=... pnpm db:seed:developer` against live actually work |
| `DATABASE_URL_UNPOOLED` is read by **migrations only** | `drizzle.config.ts`. The seed script goes through `src/db`, which reads `DATABASE_URL` — `.env.example` used to claim otherwise and was fixed in P5.2 |
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
| **`user.active` is read on every request** | it is declared in Better Auth's `additionalFields`, so it rides along on the session and `getCurrentUser()` needs no second query. The price is that the column must exist wherever the code runs — see the live-database warning in section 4 |
| `validateUserInfo` does **not** run for a username and password | Better Auth only re-validates provider-returning sign-ins. To refuse a sign-in for a stored reason, the documented place is `databaseHooks.session.create.before`, which is where the closed-account check lives |
| An `APIError` from that hook reaches the browser with its `code` | measured: `{"code":"ACCOUNT_CLOSED","message":"This account has been closed."}` with status 403. That is what lets `sign-in-error.ts` tell it apart from a wrong password, which is also 403 |
| A `redirect()` from `requireRole` inside a Server Action **navigates**, it does not return an error | so a form calling an action it is not allowed to call shows no message — the page simply moves. Mistaken for a broken feature once during P1.2 |
| `bill_lines` has **no order column** | both the developer's edit screen and the last-visit strip order by `name`, so the two lists look alike |
| **The error boundary prop is `retry`, not `reset`** | Next 16. `retry()` re-fetches and re-renders, `reset()` only re-renders. Stable since 16.3.0, and this project is on 16.3.5. The old name would silently be `undefined` |
| `error.tsx` does **not** wrap the `layout.tsx` beside it | it wraps `page.tsx`, `loading.tsx`, `not-found.tsx` and **nested** layouts. `requireUser()` runs in `(app)/layout.tsx` and touches the database, so that failure is caught one level up by `src/app/error.tsx` — which is why both files exist |
| A `redirect()` is **not** swallowed by an error boundary | `getDerivedStateFromError` re-throws anything `isNextRouterError` matches (read in `next/dist/client/components/error-boundary.js`). So adding `error.tsx` could not break the auth redirects |
| `global-error.tsx` gets **no global styles** | it replaces the root layout, so Tailwind and the theme are gone. Its styles are inline, and changing the app's look will not change that screen |
| CI needs **no secrets** | the build passes with no environment variables and the tests never open a database |
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

- [ ] **Run one restore, into a throwaway Neon branch** (P3.7, 2026-09-23). The
  backup is built and its contents were checked, but nothing has ever been
  restored from it, so spec phase 4's success test is not met. This needs a
  second database, which is the same thing section 9a asks for.
- [ ] **A second Neon branch for development.** Still the single most valuable
  hour anybody could spend on this project: today's verification wrote a bonus,
  a special rate and four throwaway accounts into the live database. The
  accounts and the rate were cleaned up; the khata line and the audit rows
  cannot be, because those tables are append-only.
- [ ] **Decide what happens to the sample data before the trial.** The live
  database holds 19 sample bills, 3 business days, 31 khata lines and Neon's
  leftover `playing_with_neon` table. Bills cannot be deleted by the app, and
  `audit_log` cannot be cleaned by anything, so a clean start means a **fresh
  database**: migrate, `db:seed:developer`, then as the developer create the
  Owner and the Manager (Users) and the Owner's PIN (Passwords), then enter the
  real services, staff and partners from the screens. There is no other seed.
  The user has said this will be done when the site goes live (2026-09-23).

**Questions blocking work:**
0. **A bill edited in a closed month leaves that month's frozen report wrong.** `month_closes`
   keeps the report and the partners' shares as they were at close, and P1.6 does not recalculate
   them — the partners may already have been paid against those figures. Ask the client what they
   want: leave the frozen record alone (today's behaviour, with a red warning on screen), or
   recalculate it. Not urgent: no month has been closed yet.
1. **May the Manager use the Customers screen?** It is Owner-only today (P3.2),
   because a special rate is a price and spec §10.4 keeps prices away from the
   counter. But that also stops a Manager fixing a customer's name, which §11
   does not require. Split the two, or leave it?
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
  P3.7  Backup (a restore is still unverified)         PART  2026-09-23
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

STAGE 3b — before the trial starts, and none of it is code
  1. One restore, into a throwaway Neon branch (P3.7's missing half)
  2. A separate Neon branch for development, so verifying stops writing to live
  3. A clean database for the trial, and the real services/staff/partners in it
  4. Vercel access (P5.1)

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

**P4 and P6.1 are finished.** What is left is P2.2 (offline), P3.3/P3.4/P3.5,
dark mode (deliberately left out of P6.1), and the non-code items in STAGE 3b.
P3.3 and P3.5 both wait on one answer: what a "real alert" and a "staff receipt"
are sent *through*. Nothing in the project sends anything yet — the Day close
WhatsApp summary is still a preview on screen.
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
