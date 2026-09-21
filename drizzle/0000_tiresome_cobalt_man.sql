CREATE TYPE "public"."cash_entry_kind" AS ENUM('expense', 'staff_advance', 'staff_payment', 'owner_took', 'owner_added');--> statement-breakpoint
CREATE TYPE "public"."khata_kind" AS ENUM('earning', 'payment', 'advance', 'bonus', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."monthly_expense_kind" AS ENUM('fixed', 'other');--> statement-breakpoint
CREATE TYPE "public"."paid_from" AS ENUM('drawer', 'owner');--> statement-breakpoint
CREATE TABLE "capital_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capital_item_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capital_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"total_cost" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capital_repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capital_item_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"paid_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "month_closes" (
	"month" date PRIMARY KEY NOT NULL,
	"closed_by" text NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"kind" "monthly_expense_kind" NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"before" jsonb,
	"after" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_cancellations" (
	"bill_id" uuid PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"cancelled_by" text NOT NULL,
	"cancelled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"service_id" uuid,
	"deal_id" uuid,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"staff_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_no" integer GENERATED ALWAYS AS IDENTITY (sequence name "bills_bill_no_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"business_date" date NOT NULL,
	"customer_id" uuid,
	"cash" integer DEFAULT 0 NOT NULL,
	"online" integer DEFAULT 0 NOT NULL,
	"reverses_bill_id" uuid,
	"book_no" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bills_bill_no_unique" UNIQUE("bill_no")
);
--> statement-breakpoint
CREATE TABLE "cash_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_date" date NOT NULL,
	"kind" "cash_entry_kind" NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"paid_from" "paid_from",
	"staff_id" uuid,
	"pin_confirmed" boolean DEFAULT false NOT NULL,
	"voids_entry_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "khata_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"kind" "khata_kind" NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"bill_id" uuid,
	"cash_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_special_rates" (
	"customer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"price" integer NOT NULL,
	CONSTRAINT "customer_special_rates_customer_id_service_id_pk" PRIMARY KEY("customer_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_items" (
	"deal_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "deal_items_deal_id_service_id_pk" PRIMARY KEY("deal_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"share_pct" numeric(5, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"minutes" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pay_type" smallint NOT NULL,
	"salary" integer DEFAULT 0 NOT NULL,
	"daily_wage" integer DEFAULT 0 NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT 0 NOT NULL,
	"pin_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_pay_type_chk" CHECK ("staff"."pay_type" in (1, 2, 3))
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"business_date" date NOT NULL,
	"staff_id" uuid NOT NULL,
	"present" boolean NOT NULL,
	CONSTRAINT "attendance_business_date_staff_id_pk" PRIMARY KEY("business_date","staff_id")
);
--> statement-breakpoint
CREATE TABLE "business_days" (
	"business_date" date PRIMARY KEY NOT NULL,
	"opening_cash" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "day_snapshots" (
	"business_date" date PRIMARY KEY NOT NULL,
	"sale" integer NOT NULL,
	"cash" integer NOT NULL,
	"online" integer NOT NULL,
	"expenses" integer NOT NULL,
	"staff_earned" integer NOT NULL,
	"staff_paid" integer NOT NULL,
	"day_profit" integer NOT NULL,
	"opening_cash" integer NOT NULL,
	"expected_cash" integer NOT NULL,
	"counted_cash" integer NOT NULL,
	"difference" integer NOT NULL,
	"diff_reason" text,
	"security_code" text NOT NULL,
	"closed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_capital_item_id_capital_items_id_fk" FOREIGN KEY ("capital_item_id") REFERENCES "public"."capital_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_repayments" ADD CONSTRAINT "capital_repayments_capital_item_id_capital_items_id_fk" FOREIGN KEY ("capital_item_id") REFERENCES "public"."capital_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_repayments" ADD CONSTRAINT "capital_repayments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_cancellations" ADD CONSTRAINT "bill_cancellations_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_lines" ADD CONSTRAINT "bill_lines_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khata_entries" ADD CONSTRAINT "khata_entries_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khata_entries" ADD CONSTRAINT "khata_entries_cash_entry_id_cash_entries_id_fk" FOREIGN KEY ("cash_entry_id") REFERENCES "public"."cash_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_special_rates" ADD CONSTRAINT "customer_special_rates_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_special_rates" ADD CONSTRAINT "customer_special_rates_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_business_date_business_days_business_date_fk" FOREIGN KEY ("business_date") REFERENCES "public"."business_days"("business_date") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_snapshots" ADD CONSTRAINT "day_snapshots_business_date_business_days_business_date_fk" FOREIGN KEY ("business_date") REFERENCES "public"."business_days"("business_date") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_key" ON "customers" USING btree ("phone");