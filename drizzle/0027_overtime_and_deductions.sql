-- Overtime and deductions (backlog P3.18). Two khata kinds and each staff
-- member's overtime rate in rupees an hour (0 = none set, every row today).
-- A value added to an enum cannot be used in the transaction that adds it;
-- nothing here uses one, and the app first writes them after this commits.
-- No trigger fires: khata_entries' guard is on UPDATE and DELETE, and staff
-- has none (it is configuration).
ALTER TYPE "public"."khata_kind" ADD VALUE 'overtime';--> statement-breakpoint
ALTER TYPE "public"."khata_kind" ADD VALUE 'deduction';--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "overtime_rate" integer DEFAULT 0 NOT NULL;