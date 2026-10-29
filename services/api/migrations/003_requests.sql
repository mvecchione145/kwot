-- Service requests posted by customers. The request document is the README-style
-- Markdown write-up that servicers read.
CREATE TYPE request_status AS ENUM ('draft', 'open', 'closed', 'cancelled');

CREATE TABLE requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_slug    text NOT NULL REFERENCES categories (slug),
  title            text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  document         text NOT NULL CHECK (length(document) BETWEEN 1 AND 20000),
  zip              text NOT NULL,           -- copied from the customer's profile at publish time
  status           request_status NOT NULL DEFAULT 'draft',
  bidding_deadline timestamptz,
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX requests_customer_idx ON requests (customer_id, created_at DESC);
-- Servicer feed: open requests by category.
CREATE INDEX requests_open_idx ON requests (category_slug, published_at DESC) WHERE status = 'open';
