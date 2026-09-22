-- A deliberate escape hatch for the developer role (backlog P1.6).
--
-- Financial rows stay append-only for everyone and everything else. What
-- changes here is that forbid_change() now lets a row through when the
-- transaction has explicitly asked for it:
--
--   select set_config('app.allow_financial_edit', 'on', true);
--
-- The third argument is what makes this safe. `true` means is_local: the
-- setting is reset when the transaction commits or rolls back, so it can never
-- survive on a pooled connection and reach the next request. There is exactly
-- one place in the app that sets it (src/db/financial-edit.ts), and it is
-- reachable only from the developer's own screen. Ordinary app code, and any
-- bug in it, still cannot change a financial row.

CREATE OR REPLACE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.allow_financial_edit', true) = 'on' THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  RAISE EXCEPTION '% on % is not allowed: financial records are append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- The record of what happened is NOT covered by that hatch, and must never be.
-- If the setting could open the audit log, the developer could erase the
-- evidence of having used it, and the whole guarantee would be worth nothing.
-- These two tables get a function no setting can open.
CREATE FUNCTION forbid_change_always() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: the record of what happened is never changed', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER audit_log_append_only ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_change_always();
--> statement-breakpoint

DROP TRIGGER day_snapshot_history_append_only ON day_snapshot_history;
--> statement-breakpoint
CREATE TRIGGER day_snapshot_history_append_only BEFORE UPDATE OR DELETE ON day_snapshot_history
  FOR EACH ROW EXECUTE FUNCTION forbid_change_always();

-- day_snapshots keeps forbid_update() from 0009, which the hatch does not
-- touch either. Nothing needs it: resettleDay() archives the old snapshot and
-- inserts a new one, so a closing record is still never updated in place.
