ALTER TABLE "cash_entries" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_client_id_unique" UNIQUE("client_id");