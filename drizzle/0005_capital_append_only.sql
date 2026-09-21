-- An investment and who contributed to it are money records, so like bills they
-- can never be edited or deleted. (forbid_change() comes from 0001_append_only.)

CREATE TRIGGER capital_items_append_only BEFORE UPDATE OR DELETE ON capital_items
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER capital_contributions_append_only BEFORE UPDATE OR DELETE ON capital_contributions
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
