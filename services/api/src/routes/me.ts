import { Router } from "express";
import type { PoolClient } from "pg";
import { z } from "zod";
import { loadUser, requireAuth, requireRole } from "../auth.js";
import { pool } from "../db.js";

export const meRouter = Router();

export const SERVICE_RADIUS_OPTIONS = [10, 25, 50, 100] as const;

const zipSchema = z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code");
const servicesSchema = z.object({
  zip: zipSchema,
  categories: z.array(z.string()).min(1, "Choose at least one service").max(20),
  radiusMiles: z.number().refine((n) => (SERVICE_RADIUS_OPTIONS as readonly number[]).includes(n)),
});

const onboardingSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("customer"), zip: zipSchema }),
  servicesSchema.extend({ role: z.literal("servicer") }),
]);

meRouter.get("/", requireAuth, (req, res) => {
  res.json(req.user);
});

/** Checks the ZIP and categories exist; returns an error code, or null when valid. */
async function validateLocation(zip: string, categories: string[] = []): Promise<string | null> {
  const { rows } = await pool.query("SELECT 1 FROM zip_centroids WHERE zip = $1", [zip]);
  if (rows.length === 0) return "unknown_zip";
  if (categories.length > 0) {
    const { rows: known } = await pool.query("SELECT slug FROM categories WHERE slug = ANY($1)", [categories]);
    if (known.length !== new Set(categories).size) return "unknown_category";
  }
  return null;
}

async function setServices(client: PoolClient, userId: string, categories: string[], radiusMiles: number) {
  await client.query("UPDATE users SET service_radius_miles = $2, updated_at = now() WHERE id = $1", [userId, radiusMiles]);
  await client.query("DELETE FROM servicer_categories WHERE user_id = $1", [userId]);
  await client.query(
    "INSERT INTO servicer_categories (user_id, category_slug) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING",
    [userId, categories],
  );
}

/** One-time onboarding: sets the account's role (immutable afterwards), ZIP, and a servicer's trades and radius. */
meRouter.post("/onboarding", requireAuth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const invalid = await validateLocation(data.zip, data.role === "servicer" ? data.categories : []);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      "UPDATE users SET role = $2, zip = $3, updated_at = now() WHERE id = $1 AND role IS NULL",
      [req.user!.id, data.role, data.zip],
    );
    if (rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "role_already_set" });
      return;
    }
    if (data.role === "servicer") await setServices(client, req.user!.id, data.categories, data.radiusMiles);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.json(await loadUser(req.user!.id));
});

/** Servicers can change their home ZIP, radius and trades at any time (US-1.4). */
meRouter.put("/services", requireAuth, requireRole("servicer"), async (req, res) => {
  const parsed = servicesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { zip, categories, radiusMiles } = parsed.data;
  const invalid = await validateLocation(zip, categories);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET zip = $2 WHERE id = $1", [req.user!.id, zip]);
    await setServices(client, req.user!.id, categories, radiusMiles);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.json(await loadUser(req.user!.id));
});
