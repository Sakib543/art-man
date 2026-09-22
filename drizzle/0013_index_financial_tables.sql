-- Indexes for the tables that grow (backlog P4.9).
--
-- Before this, four indexes existed in the whole schema and three of them
-- belonged to Better Auth. No financial table had one, and Postgres does not
-- index a foreign key by itself -- so bill_lines.bill_id, joined on nearly
-- every screen, had nothing either.
--
-- Each index below answers a query that exists today. Tables that gain only a
-- handful of rows a month (monthly_expenses, partner_drawings,
-- capital_repayments) are deliberately left alone, as are columns already
-- covered by a primary key or a unique constraint. See the backlog item for
-- the full reasoning, including why staff_id is not indexed anywhere.
--
-- Nothing here changes a result. An index can only change how long it takes.

CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_target_created_at_idx" ON "audit_log" USING btree ("action","target","created_at");--> statement-breakpoint
CREATE INDEX "bill_lines_bill_id_idx" ON "bill_lines" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "bills_business_date_bill_no_idx" ON "bills" USING btree ("business_date","bill_no");--> statement-breakpoint
CREATE INDEX "bills_customer_id_idx" ON "bills" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cash_entries_business_date_created_at_idx" ON "cash_entries" USING btree ("business_date","created_at");--> statement-breakpoint
CREATE INDEX "khata_entries_business_date_idx" ON "khata_entries" USING btree ("business_date");
