CREATE TABLE "day_snapshot_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_date" date NOT NULL,
	"sale" integer NOT NULL,
	"cash" integer NOT NULL,
	"online" integer NOT NULL,
	"expenses" integer NOT NULL,
	"staff_earned" integer NOT NULL,
	"staff_paid" integer NOT NULL,
	"day_profit" integer NOT NULL,
	"opening_cash" integer NOT NULL,
	"expected_cash" integer NOT NULL,
	"counted_cash" integer NOT NULL,
	"difference" integer NOT NULL,
	"diff_reason" text,
	"security_code" text NOT NULL,
	"closed_by" text NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"reopen_reason" text NOT NULL,
	"reopened_by" text NOT NULL,
	"reopened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "khata_entries" ADD COLUMN "reverses_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "khata_entries" ADD CONSTRAINT "khata_entries_reverses_entry_id_khata_entries_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."khata_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- A superseded closing record is a permanent record: never edited, never deleted.
-- (forbid_change() comes from 0001_append_only.)
CREATE TRIGGER day_snapshot_history_append_only BEFORE UPDATE OR DELETE ON day_snapshot_history
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint

-- A day snapshot is derived data, not a source of truth: the bills and cash entries
-- it is computed from stay append-only. It still may never be EDITED, so a closed
-- day's figures cannot be quietly altered. It may now be DELETED, which happens in
-- exactly one place: reopening a day, which first copies the row into
-- day_snapshot_history and writes the old security code to the audit log.
CREATE FUNCTION forbid_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE on % is not allowed: closing records are never edited', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER day_snapshots_append_only ON day_snapshots;
--> statement-breakpoint
CREATE TRIGGER day_snapshots_no_update BEFORE UPDATE ON day_snapshots
  FOR EACH ROW EXECUTE FUNCTION forbid_update();
