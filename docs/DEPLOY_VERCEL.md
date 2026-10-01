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

## 0.2 Deploy only from a green run (backlog P7.9)

GitHub Actions runs lint, the unit tests, a build and the integration tests (against a PostgreSQL 18
container) on every push; one job, **Deployable**, passes only when all of them did
(`.github/workflows/ci.yml`). Vercel builds each push on its own, in parallel with CI, and on its own
it would put a push live whatever CI says. Its **Deployment Checks** hold a production deployment back
until chosen GitHub checks pass — the build happens, but the domain keeps serving the previous
deployment until then, and a red run is never put live. Set once, by whoever holds the Vercel project:

1. Settings → Environments → **Production**: *automatic aliasing* (assigning the production domain
   automatically) must be on. It is the default.
2. Settings → Build and Deployment → **Deployment Checks** → **Add Checks** → provider **GitHub** →
   choose **Deployable**. Only that one: it already stands for every other job, and a job added to CI
   later is covered by adding it to Deployable's `needs`.
3. Push anything and watch the deployment: it waits while CI runs (about 2–3 minutes) and is promoted
   when Deployable goes green. A deployment can still be pushed through by hand with **Force Promote**
   on its page — for an emergency, not a habit.

The check is matched by the job's **name**. Renaming the Deployable job means choosing it again here.

Until this is set (it needs the Vercel access in step 0), a push deploys whatever CI says, as before —
so look at the CI run before telling anyone a change is live.

## 0.3 Run the app as a role that cannot empty or unlock the books (backlog P7.14)

The app has always connected as the **owner** of its tables, and an owner can do what no trigger stops:
switch a trigger off (`ALTER TABLE … DISABLE TRIGGER`), drop a table, or empty one past its trigger. Migration
`0023` made a role, **`art_man_app`**, that may read and write rows and nothing more — no `TRUNCATE`, no
`ALTER`, no `DROP`, and no `UPDATE` or `DELETE` at all on `audit_log` and `day_snapshot_history`. It cannot log
in. Every integration test already runs the app as a login in it, so the app needs nothing it lacks.

To switch the live site over — once, by whoever holds the Neon and Vercel projects:

1. In Neon's SQL editor, on the `live` branch, as the owner (`neondb_owner`):
   ```sql
   CREATE ROLE art_man_web LOGIN PASSWORD '<a long random value>' IN ROLE art_man_app;
   ```
   Make the value with the `node -e` line in step 1 below. (Neon's Roles page can make the login too; then
   run `GRANT art_man_app TO art_man_web;`.)
2. In Vercel → Settings → Environment Variables → Production, set **`DATABASE_URL`** to the `live` branch's
   **pooled** string with `art_man_web` and its password in place of the owner's. Leave
   **`DATABASE_URL_UNPOOLED`** as the owner's direct string: migrations and backups need the owner, and the
   app does not read it.
3. Redeploy (step 4), sign in, make a bill, and check the Daily report.
4. Proof, from Neon's SQL editor signed in as `art_man_web`: `TRUNCATE audit_log;` must answer
   *permission denied*, and `ALTER TABLE bills DISABLE TRIGGER bills_append_only;` *must be owner*.

Until then the triggers still refuse every change and every `TRUNCATE` — even the owner's — but an owner
could switch them off first. The two developers' `.env.local` may keep the owner: they run the migrations.

## 0.4 Give the server a key for the security codes (backlog P7.8b)

A day's security code is stored in the database it seals. Hashed without a key, anyone who can change the
database directly — Neon's console, a leaked connection string, a restored backup — can change a closed day,
work its code out again, write it back, and every day after it, and the Owner's Security codes screen shows
them all as matching (QA-26). With **`SECURITY_CODE_KEY`** set, every close and every correction is sealed with
an HMAC under a key that lives in the server's environment and **never in the database or its backups**: a
code worked out without it does not match.

Once, by whoever holds the Vercel project:

1. On any computer with the repository: `pnpm security-key`. It prints one value, `YYYY-MM-DD.<secret>`, and
   writes it nowhere. The date is the first business day that must be sealed with the key — tomorrow, Karachi
   time, by default; `pnpm security-key --since 2026-10-05` for another. Pick a day **no close has happened on
   yet, after the redeploy in step 3**: a day from it on that was closed without the key shows *Does not match*.
2. Vercel → Settings → Environment Variables → **Production**: `SECURITY_CODE_KEY` = that value.
3. Redeploy (step 4) — an environment variable reaches only the deployments made after it is set.
4. Give the Owner a copy — on paper, kept with the close slips, or in a password manager. A server rebuilt or
   moved (the VPS, P5.3) needs **the same key**, or every day sealed with it stops matching.
5. Proof: after the first close on or after the date, the Owner's Security codes screen says, under the list,
   "From \<date\>, each code is also sealed with a key kept on the server".

Rules:

- **Never change the secret.** Days sealed with it would stop matching. The date may be moved later if it was
  set too early (days between it and the redeploy were closed without the key) — change only the part before
  the dot.
- **Not in `.env.local`.** It runs against live; a day closed from a developer's computer should not carry the
  server's proof. Without the key a local close is sealed as before, and from the key's date on it shows as not
  matching — which is right: the server did not seal it.
- A value in any other form stops Day close with an error (it never seals a day without the key by mistake),
  and the Security codes screen says the key is not set up right instead of checking.
- Days closed before the date keep the plain code they were sealed with, and are checked on it. For those,
  the close slips and the Owner's notes are the check that does not depend on the database.

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

And a fifth once the salon is using the site: **`SECURITY_CODE_KEY`**, from `pnpm security-key` — section 0.4.

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
DATABASE_URL_UNPOOLED="<live direct string>" pnpm db:migrate --live
```

PowerShell has no inline-variable syntax, so there it is two commands — and a third to put it back,
which matters (see the warning below):

```powershell
$env:DATABASE_URL_UNPOOLED="<live direct string>"; pnpm db:migrate --live; Remove-Item Env:\DATABASE_URL_UNPOOLED
```

It prints the database it is about to migrate first. **`--live` is required** for any database that is
not on this computer (backlog P7.6): without it the command stops before connecting.

> **Close that terminal, or clear the variable, before running anything else.** In PowerShell the
> variable stays set for the whole session, so the next `pnpm db:migrate` — or worse, a seed — would
> go to the live database without telling you.

Never paste a live connection string into a file git tracks. `.env.example` is tracked; `.env.local`
is not.

## 3. Create the developer account

Sign-up is disabled on the website, so the first account cannot be made from the browser. Seed it
against live, from your computer:

```bash
DATABASE_URL="<live pooled string>" pnpm db:seed:developer --live
```

```powershell
$env:DATABASE_URL="<live pooled string>"; pnpm db:seed:developer --live; Remove-Item Env:\DATABASE_URL
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
| `DATABASE_URL` | the app **and the seed script** | `src/db/index.ts`. On the live site, a login in `art_man_app` once section 0.3 is done — never needed for migrations |
| `DATABASE_URL_UNPOOLED` | **migrations and backups** (`pnpm db:migrate`, `pnpm db:backup`) | `directDatabaseUrl` in `src/lib/db-target.ts`, from `scripts/migrate.ts`, `scripts/backup.ts` and `drizzle.config.ts`; falling back to `DATABASE_URL` when it is empty |
| `SECURITY_CODE_KEY` | Day close, corrections and the Security codes screen (P7.8b) | `src/lib/security-key.ts`, from `src/db/day-code.ts`. The live server only — never `.env.local` or the database (section 0.4). `YYYY-MM-DD.<secret>`; left out, codes are a plain hash |
| `CLIENT_IP_HEADER` | the sign-in flood guard and the audit log (P7.12) | `src/lib/auth/server.ts`. **Not needed on Vercel**, which overwrites `X-Forwarded-For` (the default). Behind nginx on a VPS: `proxy_set_header X-Real-IP $remote_addr;` and `CLIENT_IP_HEADER=x-real-ip` — never a header a visitor can send as they like. The account lock (5 wrong passwords in 15 minutes) does not use it |

A value set on the command line **wins over `.env.local`**: `scripts/load-env.ts` reads the file with
`process.loadEnvFile`, which leaves a variable alone if the environment already has it. And since P7.6 a
`DATABASE_URL` set on the command line on its own is used **whole** by migrations and backups: the
file's `DATABASE_URL_UNPOOLED`, which belongs to the file's database, is not paired with it. Before, it
was — so `DATABASE_URL=<local copy> pnpm db:migrate` migrated live (QA-01).

## Later changes to the database

Tables come from migrations. After changing `src/db/schema`:

```bash
pnpm db:generate          # writes the migration file — commit it
```

Then, **before pushing the code that needs it**, apply it to live:

```bash
DATABASE_URL_UNPOOLED="<live direct string>" pnpm db:migrate --live
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
