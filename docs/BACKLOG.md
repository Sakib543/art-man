# Backlog — what is left to build

The work queue. Higher sections come first. Each item records why it matters, how big it is, and
what it depends on.

**Status:** ⬜ open · 🟡 in progress · ✅ done

**Two developers share this repo and both work on `main`.** Before starting an item, put your name
and the date in its **Owner** line and push that change first, so the other person sees it. See
`docs/HANDOFF.md` section 2 for the full coordination rules.

Last updated: 2026-09-22 (P0.1 done)

---

## Item index

| ID | Item | Status | Owner |
|---|---|---|---|
| P0.1 | Show the real login error | ✅ | done 2026-09-22 |
| P0.2 | Reopen a closed day (Owner) | ⬜ | — |
| P0.3 | Cancel a bill/entry in a closed day (Owner) | ⬜ | — |
| P1.0 | Remove the staff PIN | ✅ | done 2026-09-22 |
| P1.1 | Developer role (super admin) | ⬜ | — |
| P1.2 | Users screen — create admins | ⬜ | — |
| P1.3 | Manager's limit | ✅ | no change needed |
| P2.1 | Paper bill-book number | ⬜ | — |
| P2.2 | Offline PWA + sync | ⬜ | — |
| P3.1–P3.7 | Remaining spec features | ⬜ | — |
| P4.1–P4.8 | Cleanup | ⬜ | — |
| P5.1–P5.3 | Deployment | 🟡 | — |

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

### ⬜ P0.2 — Reopen a closed day (Owner only)
**Owner:** —
`src/features/day-close/service.ts`

Over 20 days the counter staff will close a day by mistake at some point. There is currently **no
way back** — for anyone.

The screen already claims otherwise: *"Only the Owner can reopen a closed day"*
(`src/app/(app)/day-close/page.tsx:39`). That function does not exist.

**What to do:** let the Owner reopen, record it in the audit log, and refuse once the month is
closed.

**Size:** medium

---

### ⬜ P0.3 — Cancel a bill or entry in a closed day (Owner only)
**Owner:** —
`src/features/billing/service.ts:169` · `src/features/folders/service.ts:92`

If a mistake is found the next morning, nothing can be done today.

The code itself says *"Only the Owner can cancel it"* — but that path was never built. Spec §11
gives the Owner this right until the month is closed.

The client confirmed this on 2026-09-22: *"Manager can only view, cannot edit — only the Owner
can."* That "only the Owner can" half is exactly this item.

**What to do:** let the Owner cancel a bill or cash entry belonging to a closed day; reverse the
staff commission in the khata automatically; refuse once the month is closed.

**Size:** medium

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

### ⬜ P1.1 — Fourth role: `developer` (super admin)
**Owner:** —

**Client decision (2026-09-22):** a role above Owner that can do everything — reset passwords,
edit anything, and take the site down in one click.

| Capability | |
|---|---|
| See everything — including the audit log | ✅ |
| Reset any password or PIN (including the Owner's) | ✅ |
| Create, edit, deactivate users and change roles | ✅ |
| Maintenance mode — take the site down in one click | ✅ |
| Edit config — services, prices, staff, partners | ✅ |
| Edit or delete financial entries | ✅ approved, with the constraints below |

**Two things the client was told:**

1. **Passwords cannot be viewed, only reset.** Passwords and PINs are stored as scrypt hashes
   (`src/lib/pin.ts`, Better Auth). Even at the database level only the hash is visible. This is a
   technical fact, not a policy choice.

2. **Editing financial entries weakens the core guarantee.** Spec §11: *"No edit / no delete of
   financial entries — not even the Owner."* It is enforced by 13 database triggers
   (`drizzle/0001_append_only.sql`). The client was told this weakens the audit log and the
   security-code chain, and approved it anyway.

**How to build it so the damage stays bounded:**

- **Do not drop the triggers.** Ordinary app code, and any bug, must still be unable to change a
  financial row.
- Give the developer path a deliberate escape hatch — for example, have the trigger check a
  session-level setting such as `app.allow_financial_edit`, opened only inside that one
  transaction and never left on.
- **Every edit writes `before` and `after` to `audit_log`.** A row may change, but never silently.
- Recompute that day's security code and keep the previous one, so the difference stays visible.
- **The account is not hidden.** It appears in the Users screen and every action is audited. This
  also protects the developer: if the books are ever questioned, an open record is the defence.

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

## P2 — Offline

**Client decision (2026-09-22):** *"Like a proper offline app — if there is no internet for 6–8
hours the app must keep working, and when the connection returns the database updates."*

So **P2.2 is approved.** P2.1 still gets built first: it is a cheap stopgap until P2.2 ships, and
it stays useful whenever the power is out.

### ⬜ P2.1 — Cheap fallback: the paper bill book (spec §5.5)
**Owner:** —

When power or internet fails, the counter uses a numbered paper bill book; those bills are entered
before that day's Day Close.

The `bills` table **already has a `book_no` column** (`src/db/schema/billing.ts:23`) but nothing in
the app ever writes or reads it — it is a dead field today.

**What to do:** a "bill book number" field on the billing screen, shown in the daily report.
Alongside: recommend a UPS and a 4G backup device.

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
| ⬜ P4.7 | Add CI (`.github/workflows`) so build + 133 tests + lint run on every push. **More valuable now that two people share `main`** |
| ⬜ P4.8 | Remove the hardcoded `--env-file=.env.local` from the seed scripts in `package.json` — it makes seeding a live database awkward |

---

## P5 — Deployment

| | Item |
|---|---|
| 🟡 P5.1 | **Go live on Vercel** — env vars, then migrate + seed on the Neon `live` branch. The build itself already passes (verified) |
| ⬜ P5.2 | **Fix `docs/DEPLOY_VERCEL.md`** — its "First deploy" steps never mention `db:migrate` or `db:seed`, yet step 4 says "sign in as owner". This is very likely why the live site never worked |
| ⬜ P5.3 | **Move to a VPS** — after the client signs off. Postgres on the same VPS; carry the trial data over with `pg_dump` |

---

## Client decisions (2026-09-22)

| Question | Answer |
|---|---|
| Manager's limit | ✅ View only, cannot edit — only the Owner. **Already works this way** (P1.3) |
| Offline | ✅ Real offline needed — 6–8 hours without internet, then automatic sync (P2.2) |
| Developer role | ✅ Everything — reset passwords, edit anything, one-click site shutdown (P1.1) |
| Staff (karigar) PIN | ✅ Remove from the whole project (P1.0). **The Owner PIN stays** |
| Confirmation for staff payments | ✅ No replacement wanted |
| Developer editing financial entries | ✅ Approved — but audited, and not hidden (P1.1) |

## Still to ask

1. **Does a Vercel project already exist, or does it need creating from scratch?** Blocks P5.1.
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
