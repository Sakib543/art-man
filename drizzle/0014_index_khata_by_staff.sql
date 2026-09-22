-- One index, for the Staff khata screen (backlog P4.10).
--
-- The screen used to read every row of khata_entries and do the work in
-- memory. It now asks for one person's ledger by staff_id, which is a query
-- an index can answer -- so P4.9's reason for leaving this column alone no
-- longer holds.
--
-- `amount` is deliberately not part of it. The other half of the screen sums
-- balances with a `group by staff_id`, which has to read every row whatever
-- happens; measured against 10,000 generated rows, Postgres preferred a
-- sequential scan even when offered (staff_id, amount). A wider index would
-- have cost writes and earned nothing.

CREATE INDEX "khata_entries_staff_id_idx" ON "khata_entries" USING btree ("staff_id");
