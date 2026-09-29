CREATE TYPE "public"."month_adjustment_kind" AS ENUM('sale', 'expense', 'staff_earning', 'staff_taken');--> statement-breakpoint
CREATE TABLE "month_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"corrects_month" date NOT NULL,
	"kind" "month_adjustment_kind" NOT NULL,
	"amount" integer NOT NULL,
	"online" boolean,
	"paid_from" "paid_from",
	"staff_id" uuid,
	"khata_entry_id" uuid,
	"reason" text NOT NULL,
	"voids_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_adjustments_voids_id_unique" UNIQUE("voids_id")
);
--> statement-breakpoint
ALTER TABLE "month_adjustments" ADD CONSTRAINT "month_adjustments_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_adjustments" ADD CONSTRAINT "month_adjustments_khata_entry_id_khata_entries_id_fk" FOREIGN KEY ("khata_entry_id") REFERENCES "public"."khata_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_adjustments" ADD CONSTRAINT "month_adjustments_voids_id_month_adjustments_id_fk" FOREIGN KEY ("voids_id") REFERENCES "public"."month_adjustments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- An adjustment for a closed month is a money record (backlog P3.4): never
-- edited or deleted, only cancelled with a new row of the opposite sign.
-- (forbid_change() comes from 0001_append_only, with the developer's hatch
-- from 0012.)
CREATE TRIGGER month_adjustments_append_only BEFORE UPDATE OR DELETE ON month_adjustments
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
