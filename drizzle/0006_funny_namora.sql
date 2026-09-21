CREATE TABLE "partner_drawings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"month" date NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"voids_id" uuid,
	"created_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "month_closes" ADD COLUMN "report" jsonb;--> statement-breakpoint
ALTER TABLE "month_closes" ADD COLUMN "shares" jsonb;--> statement-breakpoint
ALTER TABLE "partner_drawings" ADD CONSTRAINT "partner_drawings_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_drawings" ADD CONSTRAINT "partner_drawings_voids_id_partner_drawings_id_fk" FOREIGN KEY ("voids_id") REFERENCES "public"."partner_drawings"("id") ON DELETE no action ON UPDATE no action;