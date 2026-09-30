ALTER TABLE "capital_items" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "capital_repayments" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "month_adjustments" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "partner_drawings" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "khata_entries" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "capital_items" ADD CONSTRAINT "capital_items_client_id_unique" UNIQUE("client_id");--> statement-breakpoint
ALTER TABLE "capital_repayments" ADD CONSTRAINT "capital_repayments_client_id_unique" UNIQUE("client_id");--> statement-breakpoint
ALTER TABLE "month_adjustments" ADD CONSTRAINT "month_adjustments_client_id_unique" UNIQUE("client_id");--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD CONSTRAINT "monthly_expenses_voids_id_unique" UNIQUE("voids_id");--> statement-breakpoint
ALTER TABLE "monthly_expenses" ADD CONSTRAINT "monthly_expenses_client_id_unique" UNIQUE("client_id");--> statement-breakpoint
ALTER TABLE "partner_drawings" ADD CONSTRAINT "partner_drawings_voids_id_unique" UNIQUE("voids_id");--> statement-breakpoint
ALTER TABLE "partner_drawings" ADD CONSTRAINT "partner_drawings_client_id_unique" UNIQUE("client_id");--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_voids_entry_id_unique" UNIQUE("voids_entry_id");--> statement-breakpoint
ALTER TABLE "khata_entries" ADD CONSTRAINT "khata_entries_client_id_unique" UNIQUE("client_id");