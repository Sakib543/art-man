# Architecture: where things go

The goal is that a change in one place does not break another.

Rewritten 2026-09-23 (backlog P4.2). The previous version described a layout the
project never had — `db/schema.ts` instead of the `db/schema/` folder, and no
mention of `db/queries/`, `service.ts` or `types.ts`. What is below was read off
the tree, not remembered.

```
src/
  app/
    (app)/<route>/    A signed-in page. Thin: it calls a feature's queries.ts
                      and renders that feature's components. No business logic.
    (auth)/login/     The only page reachable signed out.
    offline-billing/  The offline pages (P2.2d, P2.2e, P2.2f): Billing, Daily folders,
    offline-folders/  the Register and Day close with no internet. Static, outside
    offline-register/ (app), so the service worker can keep them and open each when
    offline-day-close/ its screen cannot load; they fill themselves from this browser's
                      IndexedDB. Each renders one feature's offline component inside
                      components/offline-page.
    api/auth/         Better Auth's route.
    api/offline/      The counter's offline copies — catalog/ (P2.2b) and day/ (P2.2e),
                      both GETs — and the outbox's syncs, sync/ (P2.2c, a bill,
                      through billing's service), folders/ (P2.2e, a folder
                      entry, through folders' service) and close/ (P2.2f, a
                      day's close, through day-close's service), all POSTs. Route
                      Handlers, because Next runs Server Actions one at a time
                      per client and background work must not hold up "Save
                      bill".
    api/staff-slip/   A staff member's salary slip for a month, as a PDF (P3.3),
                      a GET. With api/auth and api/offline these are the only
                      API routes; everything else is a Server Action. An API route checks
                      the session itself (checkUser), and one that writes checks
                      the Origin itself too (lib/same-origin.ts) — Next does
                      that only for Server Actions.
    error.tsx         Catches a failure in (app)/layout.tsx — where requireUser()
    global-error.tsx  touches the database. global-error replaces the root
                      layout, so it has no Tailwind and its styles are inline.

  features/<name>/    One folder per feature. 18 of them today.
    components/         UI for this feature only.
    actions.ts          "use server". The entry point: requireUser/requireRole
                        FIRST and outside the try, then Zod, then service.ts,
                        then revalidatePath. Returns ActionResult, never throws.
    service.ts          The work: transactions, db writes, writeAudit().
    queries.ts          Reads for the page.
    schemas.ts          Zod schemas, shared by the form and the action.
    types.ts            Plain data the server hands a Client Component.
    <pure>.ts           Feature logic with no React and no database
                        (cart-state, corrections, rules, grid, alerts...),
                        which is what makes it testable. Any file that is not
                        one of the five above is this, it is named after what it
                        decides, and a test beside it imports it.
    conventions.test.ts (in src/features/) reads these folders and fails the
                        build when the rules below are broken.

  components/         Shared app pieces: page-header, stat-card, field,
                      form-dialog, form-feedback, use-form-action, app-shell,
                      use-save-id (a form's client id, P7.2).
                      The offline pieces (P2.2) live here too, because every
                      signed-in screen carries them: pwa-setup, offline-banner,
                      use-connectivity, catalog-sync, day-sync (the copy of the
                      open day, P2.2e), and the outbox's outbox-sync (sends it),
                      use-outbox (reads it) and outbox-status (the line at the
                      top of every screen); offline-way-out, the link to a
                      screen's offline page on the loading and error screens;
                      offline-page, the frame the four offline pages share —
                      shared because each of them belongs to a different
                      feature; closed-here-note, what Billing and Daily
                      folders say about a day closed on this computer (P2.2f).
    ui/                 shadcn/ui primitives. Generic, no salon knowledge.

  lib/
    accounting/       Pure money logic: pricing, commission, deal split,
                      khata, day close, month report, partners, capital.
                      No React, no database. Covered by tests.
    auth/             Everything about *who is signed in*. The login form is
                      not here: it is a screen, so it lives in
                      features/account/components (P4.3 merged the old
                      features/auth away — three folders called some form of
                      "auth" was two too many).
                      roles.ts (the whole hierarchy), session.ts
                      (getCurrentUser / requireUser / requireRole),
                      server.ts (Better Auth), client.ts, password-rules.ts.
    business-date.ts  Karachi dates. Servers run in UTC — never slice() a date
                      off a timestamp.
    action-result.ts  The ok/error shape every action returns.
    errors.ts         UserError: a message meant for the person at the screen;
                      isUniqueViolation for the database's 23505.
    catalog.ts        The catalog's shapes and offeredDeals(), shared by the
                      billing screen and the offline copy.
    offline/          Working offline (P2.2): catalog.ts, the copy's shape and
                      version; day.ts, the open day's copy (P2.2e, with what a
                      close needs since P2.2f); outbox.ts, what waits in the
                      outbox — bills, folder entries and day closes, in what
                      order they go — and what the server's answers mean;
                      pages.ts, the offline pages
                      and what each stands in for (its test holds public/sw.js to
                      the same list); session.ts, the 12 hours per sign-in;
                      slip.ts, `T-` numbers (all pure); store.ts, the browser's
                      IndexedDB that holds them — browser only.
    same-origin.ts    Next's Server Action Origin check, for a Route Handler.
    security-code.ts · format.ts · chart.ts · alerts.ts · pin.ts · utils.ts

  db/
    index.ts          The pool and the Drizzle instance.
    schema/           Drizzle tables, split by area (auth, billing, cash, days,
                      accounts, audit, config) and re-exported from index.ts.
    queries/          Reads used by three or more features — and the offline
                      copies' reads, the exceptions: catalog.ts (the billing
                      screen and the catalog copy read it, so the two cannot
                      disagree about what is on sale), day-entries.ts (Daily
                      folders and the day copy) and day-copy.ts (the day copy,
                      and the register's staff), P2.2e. Check before adding
                      another.
    audit.ts          writeAudit(). Every important action goes through it.
    bill-cancel.ts    cancelBill + writeCancellation, shared by billing,
                      the daily report and the developer's edit.
    day-settlement.ts summarize / postEarnings / resettleDay and the guards.
    financial-edit.ts The ONLY place allowed to open the append-only hatch.
    save-once.ts      saveOnce(): an Owner money form's Save, once per client
                      id (P7.2).
    pin-guard.ts · user-account.ts · app-settings.ts · day-code.ts

  proxy.ts            Optimistic gate: is there a session cookie? It never
                      redirects away from /login — that locked people out once.
scripts/              The developer seed, db:check, db:backup. load-env.ts must be imported first.
drizzle/              Generated migrations. Never edited by hand.
```

## Rules

1. **Money logic lives only in `lib/accounting`.** Screens call it; they never
   re-calculate. If a number is wrong, there is exactly one place to fix it.
2. **Money is whole rupees as integers.** Never floats. Rounding happens in
   `lib/accounting` only.
3. **Components do not talk to the database.** Pages call `queries.ts`, forms
   call `actions.ts`.
4. **Financial rows are never edited or deleted.** A mistake is voided and
   re-entered (spec section 11). The one exception is the developer's edit
   screen — a bill, and with it a closed month's saved report and shares
   (P1.10) — which goes through `db/financial-edit.ts` and audits both sides.
   A day's closing records are replaced, never edited: a reopen or a
   correction archives the snapshot to `day_snapshot_history` and deletes it,
   and a reopen deletes the day's `attendance`, which the next close writes
   again. The database enforces all of it (migrations `0001`–`0023`).
5. **A feature imports from `lib`, `db`, `components`, never from another
   feature.** Shared pieces move up. Measured 2026-09-22: 0 violations.
6. **Every accounting change comes with a test.** `pnpm test`
7. **Permission is checked next to the data**, in `actions.ts` and in the page —
   not only in `proxy.ts`, which can only see a cookie.
8. **`requireUser`/`requireRole` go outside the `try`.** They `redirect()`, and
   a `catch` would swallow it.
9. **A feature holds only** the five role files, pure logic, tests and
   `components/`. No `.tsx` sits directly in the folder, and no other
   subfolder exists.
10. **A feature need not have all five role files.** `overview` has no writes
    and `month-close` has no schemas; empty files to satisfy a rule would be
    worse than the rule.

Rule 9, the "a test beside it" part of the tree above, and most of rules 5
and 7 are checked by `src/features/conventions.test.ts` — they were written down
here from the start and drifted anyway, because a document cannot fail a build.
Each of those checks was confirmed to fail when the rule is broken, not only to
pass today. What it does not catch yet (backlog P7.18, QA-44): rule 3 — no test
reads the components, and the build stops only a client component that imports
the database; rule 5 written as a relative import (`../billing/…`); and rule 7
for one action in a file whose others check (the test looks for one
`requireUser`/`requireRole` per `actions.ts`). It also fails on any file but
`db/financial-edit.ts` naming the developer's hatch (P7.14).

## Reference

- `docs/Art_Salon_Dev_Spec.md`: what the system does and why
- `docs/art-saloon.html`: approved look and flows
- `docs/HANDOFF.md`: working state, verified facts, and the traps
