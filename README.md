# Art Men's Salon: POS & accounts

POS and bookkeeping for a men's salon: billing, daily cash reconciliation, staff khata, monthly accounts, partners.
Built with Next.js, shadcn/ui, PostgreSQL (Neon), Drizzle and Better Auth.

- **Full guide (Roman Urdu):** [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)
- Business rules: [docs/Art_Salon_Dev_Spec.md](docs/Art_Salon_Dev_Spec.md)
- Code layout rules: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Run it locally

Needs Node.js 20+ and pnpm. You need **your own** Postgres database (a free [Neon](https://neon.tech) project, or a local Postgres). Do not ask for anyone else's connection string.

```bash
pnpm install
cp .env.example .env.local     # then fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate                # create the tables
pnpm db:seed:developer         # the developer account (the password is printed once)
pnpm dev                       # http://localhost:3000
```

Sign in as `developer` with the password printed by `pnpm db:seed:developer`. There is no other
seed: the developer creates the Owner and the Manager on the Users screen, sets the Owner's PIN on
the Passwords screen, and services, staff, partners and fixed expense lines are entered on their
own screens.

## Other commands

```bash
pnpm test     # unit tests (accounting rules, security code, ...)
pnpm lint
pnpm build
pnpm db:generate   # after changing src/db/schema, then pnpm db:migrate
```

## The one rule to keep

Money entries (bills, expenses, payments, ...) are never edited or deleted, not even by the Owner. A mistake is cancelled by adding a new entry. A database trigger enforces this.
