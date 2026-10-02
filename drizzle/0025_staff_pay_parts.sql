-- Staff pay in parts (backlog P3.17): a pay type is any mix of a monthly
-- salary, a daily wage for each day present and a commission, at least one.
-- Types 1-3 keep their meaning; 4-7 are the other mixes (PAY_PARTS in
-- src/lib/accounting/staff-pay.ts). Only the two checks widen: every row saved
-- so far is 1-3 (or null on attendance before P7.3) and passes the new ones,
-- and no trigger fires on a constraint change.
ALTER TABLE "staff" DROP CONSTRAINT "staff_pay_type_chk";--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_pay_type_chk";--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_pay_type_chk" CHECK ("staff"."pay_type" between 1 and 7);--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_pay_type_chk" CHECK ("attendance"."pay_type" between 1 and 7);