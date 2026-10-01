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
every index and constraint, the trigger functions, all 34 triggers (15 append-only,
two on the day tables and 17 against `TRUNCATE` since migration `0023`), **and**
`drizzle.__drizzle_migrations`, so a restored database knows which migrations it
has and `pnpm db:migrate` carries on from the right place.

It backs up the database `.env.local` points at — **today that is the live one**
(`docs/HANDOFF.md` section 9a). To back up a different database:

```bash
DATABASE_URL="postgres://..." pnpm db:backup
```

```powershell
$env:DATABASE_URL="postgres://..."; pnpm db:backup
```

It prints the database it reads before it starts. Since P7.6 a `DATABASE_URL` named like this is the
one backed up, whole — before, `.env.local`'s `DATABASE_URL_UNPOOLED` (live's) won, and this command
backed up live. A backup only reads, so it needs no `--live`.

**`pg_dump` must be installed.** The script looks for it on `PATH` and then in
`C:\Program Files\PostgreSQL\{18,17,16}\bin`. Point `PG_DUMP` at it otherwise:

```powershell
$env:PG_DUMP="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"; pnpm db:backup
```

Its major version must be **at least** the server's. Measured 2026-09-23:
pg_dump 18.4 against Neon's PostgreSQL 18.6 — fine.

### How often, and who

Nobody is doing this automatically yet — a schedule comes with the move to a VPS
(backlog P5.3), which is also where the files can live off this laptop. Until
that is set up, whoever closes the
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
pg_restore --list backups/art-man-<timestamp>.dump        # 2026-09-23's file: 182 entries, 31 tables with data
pg_restore --schema-only -f - backups/<file> | grep "CREATE TRIGGER"   # expect 15 (14 before migration 0020)
pg_restore --data-only --table=bills -f - backups/<file>  # the COPY block, one line per bill
```

If `--list` prints a table of contents, the file is not truncated and not
corrupt.

---

## Restoring

**Never restore over a database that has anything in it.** Restore into an empty
one and point the app at it.

1. Make somewhere to restore into: an empty database on the VPS, a **new Neon
   branch** (Neon console → Branches → New branch, then a new empty database on
   it), or — to test a backup — a throwaway PostgreSQL on this machine, which is
   how both restores so far were done (below).
2. Restore:

   ```bash
   pg_restore --no-owner --no-privileges --dbname="postgres://...<the empty database>" backups/art-man-<timestamp>.dump
   ```

3. Check it arrived:

   ```bash
   DATABASE_URL="postgres://...<the restored database>" pnpm db:check
   ```

   It prints the migration count against the ones this checkout has (and says
   when the database is behind or ahead), whether `user.active` exists and how
   many login accounts there are. They must match the backup's database.
4. Point the app at it: `DATABASE_URL` in `.env.local` locally, or in the Vercel
   project for the live site, then redeploy.

**The triggers do not get in the way of a restore.** The row triggers are
`BEFORE UPDATE OR DELETE` and the rest `BEFORE TRUNCATE` — none of them fires on
`INSERT`, which is what a restore does. This was measured, not assumed
(`docs/HANDOFF.md` section 7).

**A restore with `--no-privileges` leaves out the app's grants** (migration `0023`). If the
site runs as a login in `art_man_app` (`docs/DEPLOY_VERCEL.md` section 0.3), run the `DO`
block of `drizzle/0023_database_hardening.sql` section 5 on the restored database as its
owner before pointing the app at it; it makes the role if the server lacks it and grants it
again.

### Restores that have been run

Two, both on 2026-09-29, each from a fresh `pnpm db:backup` of the live database,
into a throwaway PostgreSQL 18.4 made in a scratch folder — no password, and the
machine's own PostgreSQL service untouched:

```bash
PG="C:/Program Files/PostgreSQL/18/bin"; DATA="<scratch folder>/pgdata"
"$PG/initdb.exe" -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C
"$PG/pg_ctl.exe" -D "$DATA" -l "<scratch folder>/pg.log" -o "-p 5544 -c listen_addresses=127.0.0.1" start
"$PG/createdb.exe" -h 127.0.0.1 -p 5544 -U postgres artman_test
"$PG/pg_restore.exe" -h 127.0.0.1 -p 5544 -U postgres -d artman_test --no-owner --no-privileges <the dump>
```

| When | Result |
|---|---|
| For P2.2f's testing | no errors; 30 tables, 14 triggers, 20 migrations, 42 bills, 24 Sep open — as live. The app ran on it for the whole session (sign-in, billing, folders, four days closed), and `verifyDayCode` recomputed every closed day's security code from the restored rows |
| For P3.4's testing | no errors; 30 tables, 14 triggers, 20 migrations, 43 bills. Migration `0020` then applied on top (21 migrations, 15 triggers) and the app ran on it: days and two months closed, adjustments recorded |

Both copies were deleted afterwards, with their dumps: a dump is the salon's
whole book. The steps for pointing the app at a copy, and for cleaning up after
it, are `docs/HANDOFF.md` trap 8.20.

**The user accepted these as spec phase 4's "restore from backup verified"
(2026-09-29)**, rather than also restoring into a throwaway Neon branch. So no
restore has been run into Neon itself. The first real one — the move to a VPS,
or an incident — is where anything particular to a managed server (its roles,
its ownership rules) would show; `--no-owner --no-privileges` is there for that.
