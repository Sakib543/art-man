-- Profit a partner drew is a money record: never edited or deleted, only cancelled
-- with a new row. (forbid_change() comes from 0001_append_only.)

CREATE TRIGGER partner_drawings_append_only BEFORE UPDATE OR DELETE ON partner_drawings
  FOR EACH ROW EXECUTE FUNCTION forbid_change();
