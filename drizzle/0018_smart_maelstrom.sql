ALTER TABLE "bills" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_client_id_unique" UNIQUE("client_id");