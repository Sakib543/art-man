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
    api/auth/         The one API route in the project. Everything else is a
                      Server Action.
    error.tsx         Catches a failure in (app)/layout.tsx — where requireUser()
    global-error.tsx  touches the database. global-error replaces the root
                      layout, so it has no Tailwind and its styles are inline.

  features/<name>/    One folder per feature. 16 of them today.
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
                      form-dialog, form-feedback, use-form-action, app-shell.
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
    errors.ts         UserError: a message meant for the person at the screen.
    security-code.ts · format.ts · chart.ts · alerts.ts · pin.ts · utils.ts

  db/
    index.ts          The pool and the Drizzle instance.
    schema/           Drizzle tables, split by area (auth, billing, cash, days,
                      accounts, audit, config) and re-exported from index.ts.
    queries/          Reads used by three or more features. All five are
                      genuinely shared — check before adding a sixth.
    audit.ts          writeAudit(). Every important action goes through it.
    bill-cancel.ts    cancelBill + writeCancellation, shared by billing,
                      the daily report and the developer's edit.
    day-settlement.ts summarize / postEarnings / resettleDay and the guards.
    financial-edit.ts The ONLY place allowed to open the append-only hatch.
    pin-guard.ts · user-account.ts · app-settings.ts · day-code.ts

  proxy.ts            Optimistic gate: is there a session cookie? It never
                      redirects away from /login — that locked people out once.
scripts/              Seeds and db:check. load-env.ts must be imported first.
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
   screen, which goes through `db/financial-edit.ts` and audits both sides.
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

Rules 3, 5, 7, 9 and the "a test beside it" part of the tree above are checked
by `src/features/conventions.test.ts` — they were written down here from the
start and drifted anyway, because a document cannot fail a build. Each of those
checks was confirmed to fail when the rule is broken, not only to pass today.

## Reference

- `docs/Art_Salon_Dev_Spec.md`: what the system does and why
- `docs/art-saloon.html`: approved look and flows
- `docs/HANDOFF.md`: working state, verified facts, and the traps
