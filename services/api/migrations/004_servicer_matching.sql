-- Matching open requests to servicers by trade and distance (US-1.4, US-3.1).

-- Centre point of each US ZIP Code Tabulation Area. Rows are loaded at startup from
-- data/zip_centroids.csv (see seedZipCentroids in src/db.ts).
CREATE TABLE zip_centroids (
  zip text PRIMARY KEY,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);

-- Servicer profile: how far from their home ZIP they travel, and which trades they offer.
ALTER TABLE users ADD COLUMN service_radius_miles int CHECK (service_radius_miles BETWEEN 1 AND 200);

CREATE TABLE servicer_categories (
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_slug text NOT NULL REFERENCES categories (slug),
  PRIMARY KEY (user_id, category_slug)
);

-- Great-circle distance in miles (haversine).
CREATE FUNCTION miles_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT 3958.8 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;
