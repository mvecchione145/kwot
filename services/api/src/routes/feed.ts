import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth.js";
import { pool } from "../db.js";

/** Open requests a servicer can bid on: in their trades and within their service radius (US-3.1, US-3.2). */
export const feedRouter = Router();
feedRouter.use(requireAuth, requireRole("servicer"));

// Never selects the customer: servicers only see who posted once they're selected (US-4.2).
const MATCHING_REQUESTS = `
  SELECT r.id, r.category_slug AS "categorySlug", c.name AS "categoryName", r.title, r.document,
         r.zip, r.bidding_deadline AS "biddingDeadline", r.published_at AS "publishedAt",
         round(miles_between(home.lat, home.lng, loc.lat, loc.lng))::int AS "distanceMiles"
  FROM users s
  JOIN zip_centroids home ON home.zip = s.zip
  JOIN servicer_categories sc ON sc.user_id = s.id
  JOIN requests r ON r.category_slug = sc.category_slug
  JOIN categories c ON c.slug = r.category_slug
  JOIN zip_centroids loc ON loc.zip = r.zip
  WHERE s.id = $1
    AND r.status = 'open'
    AND (r.bidding_deadline IS NULL OR r.bidding_deadline > now())
    AND miles_between(home.lat, home.lng, loc.lat, loc.lng) <= s.service_radius_miles`;

const listSchema = z.object({
  category: z.string().optional(),
  sort: z.enum(["newest", "deadline"]).default("newest"),
});

feedRouter.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { category, sort } = parsed.data;
  const orderBy = sort === "deadline" ? `"biddingDeadline" ASC NULLS LAST` : `"publishedAt" DESC`;
  const { rows } = await pool.query(
    `SELECT * FROM (${MATCHING_REQUESTS} AND ($2::text IS NULL OR r.category_slug = $2)) matches
     ORDER BY ${orderBy}`,
    [req.user!.id, category ?? null],
  );
  res.json(rows);
});

/** A single request, only while it's still in this servicer's feed. */
feedRouter.get("/:id", async (req, res) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { rows } = await pool.query(`${MATCHING_REQUESTS} AND r.id = $2`, [req.user!.id, id.data]);
  if (rows.length === 0) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(rows[0]);
});
