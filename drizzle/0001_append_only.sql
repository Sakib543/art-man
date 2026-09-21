-- Financial records are never edited or deleted, not even by the owner.
-- Mistakes are fixed by adding new rows (cancellation + reversal + corrected entry).
-- This is enforced here in the database so no bug in the app can bypass it.

CREATE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: financial records are append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER bills_append_only BEFORE UPDATE OR DELETE ON bills
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER bill_lines_append_only BEFORE UPDATE OR DELETE ON bill_lines
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER bill_cancellations_append_only BEFORE UPDATE OR DELETE ON bill_cancellations
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER cash_entries_append_only BEFORE UPDATE OR DELETE ON cash_entries
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER khata_entries_append_only BEFORE UPDATE OR DELETE ON khata_entries
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER day_snapshots_append_only BEFORE UPDATE OR DELETE ON day_snapshots
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER monthly_expenses_append_only BEFORE UPDATE OR DELETE ON monthly_expenses
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER capital_repayments_append_only BEFORE UPDATE OR DELETE ON capital_repayments
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER month_closes_append_only BEFORE UPDATE OR DELETE ON month_closes
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
