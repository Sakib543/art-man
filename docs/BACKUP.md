# Backup and restore

Written 2026-09-23 (backlog P3.7). Before this the project had **no backup at
all** — no script, no schedule, nothing to restore from. Spec phase 4 asks for
backup/restore with the success test *"restore from backup verified"*.

> **A backup file is the salon's whole book of accounts in plain form.** It holds
> every bill, every customer's phone number and the password hashes. It goes to
> `backups/`, which is git-ignored. Never commit one, never put one in a chat or
> an email, and keep the copies somewhere the salon controls.

---

## Taking a backup

```bash
pnpm db:backup
```

It writes `backups/art-man-<timestamp>.dump` — one file, `pg_dump`'s custom
format, which `pg_restore` reads. It contains the schema, the data, the enums,
every index and constraint, the three trigger functions, all 14 append-only
triggers, **and** `drizzle.__drizzle_migrations`, so a restored database knows
which migrations it has and `pnpm db:migrate` carries on from the right place.

It backs up the database `.env.local` points at — **today that is the live one**
(`docs/HANDOFF.md` section 9a). To back up a different database:

```bash
DATABASE_URL="postgres://..." pnpm db:backup
```

```powershell
$env:DATABASE_URL="postgres://..."; pnpm db:backup
```

**`pg_dump` must be installed.** The script looks for it on `PATH` and then in
`C:\Program Files\PostgreSQL\{18,17,16}\bin`. Point `PG_DUMP` at it otherwise:

```powershell
$env:PG_DUMP="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"; pnpm db:backup
```

Its major version must be **at least** the server's. Measured 2026-09-23:
pg_dump 18.4 against Neon's PostgreSQL 18.6 — fine.

### How often, and who

Nobody is doing this automatically yet. Until that is set up, whoever closes the
month should take one, and one should be taken **before** anything unusual:
running a migration against live, editing a bill as the developer, or moving to
a new host.

Neon keeps its own **point-in-time history** as well, which covers "undo the
last hour" better than any file does. It does not cover the account itself going
away, which is exactly what a file in the salon's own hands does cover. Keep
both.

---

## Reading a backup without restoring it

This is how the file was checked on 2026-09-23, and it is worth doing after any
backup you actually care about:

```bash
pg_restore --list backups/art-man-<timestamp>.dump        # 182 entries, 31 tables with data
pg_restore --schema-only -f - backups/<file> | grep "CREATE TRIGGER"   # expect 14
pg_restore --data-only --table=bills -f - backups/<file>  # the COPY block, one line per bill
```

If `--list` prints a table of contents, the file is not truncated and not
corrupt.

---

## Restoring

**Never restore over a database that has anything in it.** Restore into an empty
one and point the app at it.

1. Make somewhere to restore into — a **new Neon branch** (Neon console →
   Branches → New branch → *from the current state*, empty schema) or a fresh
   database on the VPS.
2. Restore:

   ```bash
   pg_restore --no-owner --no-privileges --dbname="postgres://...<the empty database>" backups/art-man-<timestamp>.dump
   ```

3. Check it arrived:

   ```bash
   DATABASE_URL="postgres://...<the restored database>" pnpm db:check
   ```

   It prints the migration count, whether `user.active` exists and how many
   login accounts there are. They must match the backup's database.
4. Point the app at it: `DATABASE_URL` in `.env.local` locally, or in the Vercel
   project for the live site, then redeploy.

**The append-only triggers do not get in the way of a restore.** All 14 are
`BEFORE UPDATE OR DELETE` — none of them fires on `INSERT`, which is what a
restore does. This was measured, not assumed (`docs/HANDOFF.md` section 7).

### Not yet done: an actual restore

**No restore has ever been run**, because there is no second database to run it
into — `.env.local` is the live one and nothing else is available from here. The
file has been checked from the outside (above) and its contents match the
database it came from: 19 bills, 31 khata lines, 14 triggers, 3 functions, 31
tables with data.

**That is not the same as a verified restore, and the spec asks for one.** Do it
once, on a throwaway Neon branch, before the trial starts. Until then, treat the
backup as untested.
