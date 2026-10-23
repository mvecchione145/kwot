-- Requests are open-ended: categories are only used to match requests to servicers'
-- trades, so the per-category question templates are no longer needed.
ALTER TABLE categories DROP COLUMN questions;
