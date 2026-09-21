# Architecture: where things go

The goal is that a change in one place does not break another.

```
src/
  app/              Routes only. Thin files that render a feature. No business logic.
  features/<name>/  One folder per feature (billing, day-close, staff, ...)
    components/       UI for this feature only
    actions.ts        Server Actions (write data). Validate with Zod, then call db + accounting.
    queries.ts        Read data for pages
    schemas.ts        Zod schemas for forms and actions
  components/ui/    shadcn/ui primitives. Generic, no salon knowledge.
  components/       Shared app components (sidebar, page header, money display)
  lib/
    accounting/     Pure functions: commission, deal split, expected cash, net profit.
                    No React, no database. Fully covered by tests.
    utils.ts        Generic helpers
  db/
    schema.ts       Drizzle tables
    index.ts        Database connection
```

## Rules

1. **Money logic lives only in `lib/accounting`.** Screens call it; they never
   re-calculate. If a number is wrong, there is exactly one place to fix it.
2. **Money is whole rupees as integers.** Never floats. Rounding happens in
   `lib/accounting` only.
3. **Components do not talk to the database.** Pages call `queries.ts`, forms
   call `actions.ts`.
4. **Financial rows are never edited or deleted.** A mistake is voided and
   re-entered (see the spec, section 11).
5. **A feature imports from `lib`, `db`, `components`, not from another feature.**
   Shared pieces move up into `components/` or `lib/`.
6. **Every accounting change comes with a test.** `pnpm test`

## Reference

- `docs/Art_Salon_Dev_Spec.md`: what the system does and why
- `docs/art-saloon.html`: approved look and flows
