import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth.js";
import { pool } from "../db.js";

export const requestsRouter = Router();
requestsRouter.use(requireAuth, requireRole("customer"));

const BIDDING_PERIOD = "7 days";

const COLUMNS = `
  r.id, r.category_slug AS "categorySlug", c.name AS "categoryName", r.title, r.document,
  r.zip, r.status, r.bidding_deadline AS "biddingDeadline", r.published_at AS "publishedAt",
  r.created_at AS "createdAt", r.updated_at AS "updatedAt"`;

const contentSchema = z.object({
  categorySlug: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  document: z.string().trim().min(1).max(20_000),
});

const createSchema = contentSchema.extend({
  // false saves a draft the customer can come back to.
  publish: z.boolean().default(true),
});

/** Parses the body, checks the category exists, and sends a 400 otherwise. */
async function parseContent<T extends z.ZodType<z.infer<typeof contentSchema>>>(
  schema: T,
  req: Request,
  res: Response,
): Promise<z.infer<T> | null> {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return null;
  }
  const { rows } = await pool.query("SELECT 1 FROM categories WHERE slug = $1", [parsed.data.categorySlug]);
  if (rows.length === 0) {
    res.status(400).json({ error: "unknown_category" });
    return null;
  }
  return parsed.data;
}

/** Returns the customer's request (with category name), or null. */
async function findOwn(id: string, customerId: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM requests r JOIN categories c ON c.slug = r.category_slug
     WHERE r.id = $1 AND r.customer_id = $2`,
    [id, customerId],
  );
  return rows[0] ?? null;
}

/**
 * Runs an UPDATE on one of the customer's requests that is in the expected status,
 * then responds with the updated request: 404 if it isn't theirs, 409 if the status is wrong.
 */
async function transition(
  req: Request,
  res: Response,
  fromStatus: string,
  set: string,
  params: unknown[] = [],
): Promise<void> {
  const existing = await findOwn(req.params.id as string, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { rowCount } = await pool.query(
    `UPDATE requests SET ${set}, updated_at = now() WHERE id = $1 AND status = '${fromStatus}'`,
    [existing.id, ...params],
  );
  if (rowCount === 0) {
    res.status(409).json({ error: "invalid_status", status: existing.status });
    return;
  }
  res.json(await findOwn(existing.id, req.user!.id));
}

/** Creates a request: published straight away (US-2.4) or saved as a draft. */
requestsRouter.post("/", async (req, res) => {
  const data = await parseContent(createSchema, req, res);
  if (!data) return;
  const user = req.user!;
  if (!user.zip) {
    res.status(409).json({ error: "onboarding_incomplete" });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO requests (customer_id, category_slug, title, document, zip, status, published_at, bidding_deadline)
     VALUES ($1, $2, $3, $4, $5,
             CASE WHEN $6 THEN 'open'::request_status ELSE 'draft' END,
             CASE WHEN $6 THEN now() END,
             CASE WHEN $6 THEN now() + interval '${BIDDING_PERIOD}' END)
     RETURNING id`,
    [user.id, data.categorySlug, data.title, data.document, user.zip, data.publish],
  );
  res.status(201).json(await findOwn(rows[0].id, user.id));
});

/** The customer's own requests, newest first (US-2.6). */
requestsRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM requests r JOIN categories c ON c.slug = r.category_slug
     WHERE r.customer_id = $1
     ORDER BY r.created_at DESC`,
    [req.user!.id],
  );
  res.json(rows);
});

/** One of the customer's requests. Other customers' requests are reported as not found. */
requestsRouter.get("/:id", async (req, res) => {
  const request = await findOwn(req.params.id, req.user!.id);
  if (!request) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(request);
});

/** Edits a draft. */
requestsRouter.put("/:id", async (req, res) => {
  const data = await parseContent(contentSchema, req, res);
  if (!data) return;
  await transition(req, res, "draft", "category_slug = $2, title = $3, document = $4", [
    data.categorySlug,
    data.title,
    data.document,
  ]);
});

/** Publishes a draft. The ZIP is refreshed from the customer's profile. */
requestsRouter.post("/:id/publish", async (req, res) => {
  await transition(
    req,
    res,
    "draft",
    `status = 'open', zip = $2, published_at = now(), bidding_deadline = now() + interval '${BIDDING_PERIOD}'`,
    [req.user!.zip],
  );
});

/** Cancels an open request; it leaves servicers' feeds (US-2.6). */
requestsRouter.post("/:id/cancel", async (req, res) => {
  await transition(req, res, "open", "status = 'cancelled'");
});

/** Deletes a draft. Published requests are cancelled instead, never deleted. */
requestsRouter.delete("/:id", async (req, res) => {
  const existing = await findOwn(req.params.id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { rowCount } = await pool.query("DELETE FROM requests WHERE id = $1 AND status = 'draft'", [existing.id]);
  if (rowCount === 0) {
    res.status(409).json({ error: "invalid_status", status: existing.status });
    return;
  }
  res.status(204).end();
});

/** Closes open requests whose bidding deadline has passed (US-4.3). Returns how many closed. */
export async function closeExpiredRequests(): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE requests SET status = 'closed', updated_at = now()
     WHERE status = 'open' AND bidding_deadline <= now()`,
  );
  return rowCount ?? 0;
}
