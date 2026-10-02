-- Pay types back to the spec's three (P3.17 taken back, 2026-10-02). 0025
-- widened both checks to 1-7 for the pay-in-parts mixes; the user asked for
-- pay as it was, so the code went back to types 1-3 and the checks follow.
-- Adding a check validates every row: if a staff member or a day's
-- attendance was saved with a type 4-7 while 0025's code was live, this
-- fails and changes nothing - put that row back on a type 1-3 first.
ALTER TABLE "staff" DROP CONSTRAINT "staff_pay_type_chk";--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_pay_type_chk";--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_pay_type_chk" CHECK ("staff"."pay_type" in (1, 2, 3));--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_pay_type_chk" CHECK ("attendance"."pay_type" in (1, 2, 3));