# Deploy on Vercel

Two databases, on purpose:

| Neon branch | Used by | Contents |
|---|---|---|
| `production` (Neon's default) | Your computer (`.env.local`) | Test and sample data. Safe to break |
| `live` | The website on Vercel | Real salon data only |

Local testing never touches the live data as long as `.env.local` points at the dev branch.

---

## 0. Before you start: you need access to the Vercel project

The project **already exists** and is connected to this same repo — but it lives in the **other
developer's Vercel account** (confirmed 2026-09-22). Environment variables can only be set from
inside it, so nothing below can be done until you are invited to that project or it is transferred
to you. Ask them for that, and for the project's **Production domain**, which you need in step 1.

## 0.1 A push to `main` deploys itself

Vercel is connected to this repo, so every push to `main` builds and deploys on its own. Two things
follow, and both have already cost time:

- **The build succeeds with no environment variables set at all** (measured, not assumed). A green
  deployment therefore does *not* mean the site works. It only means the code compiled.
- **Apply a migration to the live database before you push the code that needs it.** Push first and
  the deployed site is querying columns that do not exist yet. See "Later changes to the database".

---

## 1. Environment variables

Vercel → the project → Settings → Environment Variables. Add four (see `.env.example` for what each
one is):

| Key | Value |
|---|---|
| `DATABASE_URL` | the **pooled** Neon string of the `live` branch |
| `DATABASE_URL_UNPOOLED` | the **direct** string of the same branch |
| `BETTER_AUTH_SECRET` | a long random value, different from the one on your computer |
| `BETTER_AUTH_URL` | the project's real Production domain, e.g. `https://<project>.vercel.app`, with no slash at the end |

Set them for **Production** only, so Preview deployments can never touch the live data.

> Preview deployments will then have no database and will fail at runtime. That is intended, not a
> fault. Only the Production deployment is meant to work.

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 2. Create the tables on the live branch

**This step and the next were missing from this guide, and are the most likely reason the site never
worked.** Setting the variables does not create any tables. Migrations do, and they are run from
your computer against the live branch.

Run one of these from the repo root. The connection string is the live branch's **direct**
(non-pooled) one:

```bash
DATABASE_URL_UNPOOLED="<live direct string>" pnpm db:migrate
```

PowerShell has no inline-variable syntax, so there it is two commands — and a third to put it back,
which matters (see the warning below):

```powershell
$env:DATABASE_URL_UNPOOLED="<live direct string>"; pnpm db:migrate; Remove-Item Env:\DATABASE_URL_UNPOOLED
```

> **Close that terminal, or clear the variable, before running anything else.** In PowerShell the
> variable stays set for the whole session, so the next `pnpm db:migrate` — or worse, a seed — would
> go to the live database without telling you.

Never paste a live connection string into a file git tracks. `.env.example` is tracked; `.env.local`
is not.

## 3. Create the developer account

Sign-up is disabled on the website, so the first account cannot be made from the browser. Seed it
against live, from your computer:

```bash
DATABASE_URL="<live pooled string>" pnpm db:seed:developer
```

```powershell
$env:DATABASE_URL="<live pooled string>"; pnpm db:seed:developer; Remove-Item Env:\DATABASE_URL
```

It creates `developer` and **prints its password once**. Write it down there and then — running it
again only says `skip` and prints nothing.

This is the **only** seed script (backlog P1.9). There is no seed for the Owner, the Manager,
partners, fixed expense lines or sample data any more: all of it is entered from the screens in
steps 6 and 7, so nothing placeholder ever reaches the live books.

> The same warning as step 2, and worse here: while `$env:DATABASE_URL` is set, a `pnpm dev` in that
> same PowerShell session would run your local app **against the live database**.

## 4. Redeploy

Vercel → Deployments → the latest one → Redeploy. Environment variables only apply to deployments
made after they were set, so a redeploy is required even though the code has not changed.

## 5. Sign in as the developer

Open the site and sign in as `developer` with the password from step 3. If it is lost, see
`docs/HANDOFF.md` section 9a — a signed-out developer has no screen to recover from.

## 6. Create the Owner and the Manager

As the developer:

1. **Users** — create the Owner and the Manager. You type each password; read it out to the person,
   because it cannot be shown again. Only the developer can reset it later (P1.8).
2. **Passwords** — set the Owner's 4-digit PIN. The Owner confirms cash taken from or added to the
   drawer with it; without one, that folder cannot be used.

The Owner can change their own password and PIN from Settings afterwards.

## 7. Enter the real data

As the Owner (or the developer):

1. **Staff & rates** — the staff, their pay type and rates, then services and deals.
   (Staff have no PIN. That was removed from the whole project; only the Owner has one.)
2. **Partners** — real names and shares.
3. **Monthly expenses** — the fixed monthly lines (rent, electricity, and so on).
4. **Day close** → "Open the first business day".

---

## Which variable does what

Measured from the code, because guessing this is how the wrong database gets written to:

| Variable | Read by | Where |
|---|---|---|
| `DATABASE_URL` | the app **and the seed script** | `src/db/index.ts` |
| `DATABASE_URL_UNPOOLED` | **migrations only** (`pnpm db:migrate`) | `drizzle.config.ts`, falling back to `DATABASE_URL` when it is empty |

A value set on the command line **wins over `.env.local`**: both `drizzle.config.ts`
(`process.loadEnvFile`) and the scripts (`scripts/load-env.ts`, the same call) leave a variable alone if
the environment already has it. Verified by testing it, so the commands above do go to live.

## Later changes to the database

Tables come from migrations. After changing `src/db/schema`:

```bash
pnpm db:generate          # writes the migration file — commit it
```

Then, **before pushing the code that needs it**, apply it to live:

```bash
DATABASE_URL_UNPOOLED="<live direct string>" pnpm db:migrate
```

Order matters because pushing to `main` deploys by itself (section 0.1). Migrate first, then push.

Only one person generates a migration at a time — see `docs/HANDOFF.md` section 8.1.

## Notes

- Region: Vercel's default (Washington DC) is close to Neon's `us-east-2` (Ohio). Keep the server
  and the database in the same region — pages run 5–11 database queries each.
- Vercel's free Hobby plan is for non-commercial use. A salon is a business, so use a paid plan.
- Once the data is real, use a Neon plan that keeps enough history to restore from, and keep your
  own backups.
- If a login fails on the live site, read the message: since P0.1 it says plainly whether the
  password was wrong or the server could not be reached, and gives the HTTP status. A database that
  is unreachable no longer looks like a typed-wrong password.
