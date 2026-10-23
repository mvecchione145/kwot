import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { pool } from "../db.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req, res) => {
  res.json(req.user);
});

const onboardingSchema = z.object({
  role: z.enum(["customer", "servicer"]),
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
});

/** One-time onboarding: sets the account's role (immutable afterwards) and ZIP. */
meRouter.post("/onboarding", requireAuth, async (req, res) => {
  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { rows } = await pool.query(
    `UPDATE users SET role = $2, zip = $3, updated_at = now()
     WHERE id = $1 AND role IS NULL
     RETURNING id, keycloak_id AS "keycloakId", email, name, role, zip`,
    [req.user!.id, parsed.data.role, parsed.data.zip],
  );
  if (rows.length === 0) {
    res.status(409).json({ error: "role_already_set" });
    return;
  }
  res.json(rows[0]);
});
