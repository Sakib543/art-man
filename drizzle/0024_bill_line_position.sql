-- Where each line stood on its bill (backlog P7.17, QA-32). bill_lines had no
-- order of its own, so a reprinted receipt listed the lines in whatever order
-- the database gave them back, not as the slip the customer was handed. New
-- lines are numbered from 0; lines saved before stay null and are ordered by
-- name, as they were. Adding a nullable column rewrites no row, and the
-- append-only trigger fires on UPDATE and DELETE only, so it is untouched.
ALTER TABLE "bill_lines" ADD COLUMN "position" smallint;