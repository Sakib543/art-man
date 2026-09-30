ALTER TABLE "attendance" ADD COLUMN "pay_type" smallint;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "salary" integer;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "daily_wage" integer;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "commission_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_pay_type_chk" CHECK ("attendance"."pay_type" in (1, 2, 3));