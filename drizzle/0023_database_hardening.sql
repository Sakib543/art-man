-- Database hardening (backlog P7.14; QA-23, QA-24, QA-12).
--
-- What the append-only triggers of 0001–0020 did not cover: TRUNCATE, which
-- fires no row trigger; a hatch any connection could open for the rest of its
-- session; the two day tables, which had no trigger at all; and an app that
-- runs as the owner of its tables, who may switch a trigger off.

-- 1. The developer's hatch (0012) opens for one transaction, by its id.
--
-- It used to open on the word 'on'. `set_config(..., true)` in
-- src/db/financial-edit.ts kept that to the one transaction, but a plain
-- `SET app.allow_financial_edit = 'on'` from any connection opened every
-- financial table for the rest of the session — on a pooled connection, for
-- the requests after it too (QA-24). Now the setting must name the transaction
-- it is made in: a session-level SET names none, and a value left behind names
-- a transaction that has ended. Only financial-edit.ts writes it, and a
-- conventions test fails if anything else does.
CREATE OR REPLACE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.allow_financial_edit', true) = pg_current_xact_id()::text THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  RAISE EXCEPTION '% on % is not allowed: financial records are append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- 2. TRUNCATE is refused on every financial table (QA-23).
--
-- The triggers above are FOR EACH ROW, and TRUNCATE touches no row: it emptied
-- all of them, audit_log included. A statement trigger fires for it — for each
-- table a TRUNCATE ... CASCADE reaches as well. No hatch opens it: nothing in
-- the app ever empties a table.
CREATE FUNCTION forbid_truncate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TRUNCATE on % is not allowed: financial records are never emptied', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER attendance_no_truncate BEFORE TRUNCATE ON attendance FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER bill_cancellations_no_truncate BEFORE TRUNCATE ON bill_cancellations FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER bill_lines_no_truncate BEFORE TRUNCATE ON bill_lines FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER bills_no_truncate BEFORE TRUNCATE ON bills FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER business_days_no_truncate BEFORE TRUNCATE ON business_days FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER capital_contributions_no_truncate BEFORE TRUNCATE ON capital_contributions FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER capital_items_no_truncate BEFORE TRUNCATE ON capital_items FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER capital_repayments_no_truncate BEFORE TRUNCATE ON capital_repayments FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER cash_entries_no_truncate BEFORE TRUNCATE ON cash_entries FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER day_snapshot_history_no_truncate BEFORE TRUNCATE ON day_snapshot_history FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER day_snapshots_no_truncate BEFORE TRUNCATE ON day_snapshots FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER khata_entries_no_truncate BEFORE TRUNCATE ON khata_entries FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER month_adjustments_no_truncate BEFORE TRUNCATE ON month_adjustments FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER month_closes_no_truncate BEFORE TRUNCATE ON month_closes FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER monthly_expenses_no_truncate BEFORE TRUNCATE ON monthly_expenses FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint
CREATE TRIGGER partner_drawings_no_truncate BEFORE TRUNCATE ON partner_drawings FOR EACH STATEMENT EXECUTE FUNCTION forbid_truncate();
--> statement-breakpoint

-- 3. A business day is closed and reopened, and nothing else (QA-12).
--
-- Its date, opening cash and created_at are set when it is opened — the
-- opening cash is the last day's count, and the next day's is this one's —
-- and never change. Only closed_at may: set by Day close, cleared by a reopen.
-- A day is never deleted. No hatch opens this either: no correction needs it.
CREATE FUNCTION guard_business_day() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETE on business_days is not allowed: a business day is never removed'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF (to_jsonb(NEW) - 'closed_at') IS DISTINCT FROM (to_jsonb(OLD) - 'closed_at') THEN
    RAISE EXCEPTION 'UPDATE on business_days may only close or reopen the day: its date and opening cash never change'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.closed_at IS NOT NULL AND NEW.closed_at IS NOT NULL AND NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'UPDATE on business_days is not allowed: a closed day is reopened before it is closed again'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER business_days_guard BEFORE UPDATE OR DELETE ON business_days
  FOR EACH ROW EXECUTE FUNCTION guard_business_day();
--> statement-breakpoint

-- 4. A closed day's staff list is never edited (QA-12).
--
-- attendance holds who was present and the pay each day was settled on
-- (P7.3), which a correction to the day is settled on again. It is written at
-- Day close and removed when the day is reopened — the reopen clears the day's
-- closed_at first, in the same transaction — so a row may be deleted only
-- while its day is open, and never updated.
CREATE FUNCTION guard_attendance() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'UPDATE on attendance is not allowed: a day''s staff list is never edited'
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM business_days WHERE business_date = OLD.business_date AND closed_at IS NULL) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'DELETE on attendance is not allowed while its day is closed: reopening the day removes it'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER attendance_guard BEFORE UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION guard_attendance();
--> statement-breakpoint

-- 5. A role for the app that does not own its tables (QA-23, QA-24).
--
-- Whoever owns a table may switch its triggers off (ALTER TABLE ... DISABLE
-- TRIGGER), drop it or truncate it past any trigger by disabling it first —
-- and the app has always connected as the owner. art_man_app may read and
-- write rows and nothing more: no TRUNCATE, no ALTER, no DROP, and on the two
-- records nothing opens (audit_log, day_snapshot_history) no UPDATE or DELETE
-- at all, whatever a trigger says. Tables a later migration adds are granted
-- the same by default.
--
-- It cannot log in. The app runs as it once a login role in it is made and
-- DATABASE_URL names that login (docs/DEPLOY_VERCEL.md, section 0.3);
-- migrations and backups stay with the owner (DATABASE_URL_UNPOOLED). Roles
-- belong to the whole server, so it may exist already. Where the migrating
-- role may not create roles, this step is skipped with a notice and the rest
-- of the migration still applies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'art_man_app') THEN
    BEGIN
      CREATE ROLE art_man_app NOLOGIN;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'art_man_app was not created: this role may not create roles. Create it as an administrator and run section 5 of drizzle/0023 again.';
      RETURN;
    END;
  END IF;
  GRANT USAGE ON SCHEMA public TO art_man_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO art_man_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO art_man_app;
  REVOKE UPDATE, DELETE ON audit_log, day_snapshot_history FROM art_man_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO art_man_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO art_man_app;
END
$$;
