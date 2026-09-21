CREATE TABLE "fixed_expense_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"paid_by_owner" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capital_repayments" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "capital_repayments" ADD COLUMN "created_by" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD COLUMN "paid_from" "paid_from" DEFAULT 'drawer' NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD COLUMN "voids_id" uuid;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD COLUMN "created_by" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD CONSTRAINT "monthly_expenses_voids_id_monthly_expenses_id_fk" FOREIGN KEY ("voids_id") REFERENCES "public"."monthly_expenses"("id") ON DELETE no action ON UPDATE no action;