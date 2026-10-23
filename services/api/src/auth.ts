import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { config } from "./config.js";
import { pool } from "./db.js";

const jwks = createRemoteJWKSet(new URL(config.keycloak.jwksUrl));

export type Role = "customer" | "servicer";

export interface AppUser {
  id: string;
  keycloakId: string;
  email: string;
  name: string | null;
  role: Role | null;
  zip: string | null;
  /** Servicers only: how far from their ZIP they travel, and the trades they offer. */
  serviceRadiusMiles: number | null;
  categories: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

interface KeycloakClaims extends JWTPayload {
  email?: string;
  name?: string;
  preferred_username?: string;
}

/**
 * Verifies the Keycloak access token and loads (or creates) the matching app user.
 * Keycloak owns identity; the app database owns the user's kwōt role and profile.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  let claims: KeycloakClaims;
  try {
    ({ payload: claims } = await jwtVerify<KeycloakClaims>(header.slice(7), jwks, {
      issuer: config.keycloak.issuer,
      audience: config.keycloak.audience,
    }));
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!claims.sub) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const email = claims.email ?? claims.preferred_username ?? "";
  const { rows } = await pool.query(
    `INSERT INTO users (keycloak_id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (keycloak_id) DO UPDATE
       SET email = EXCLUDED.email, name = EXCLUDED.name, updated_at = now()
     RETURNING id`,
    [claims.sub, email, claims.name ?? null],
  );
  req.user = (await loadUser(rows[0].id))!;
  next();
}

/** Loads the app user, including a servicer's trades. */
export async function loadUser(id: string): Promise<AppUser | null> {
  const { rows } = await pool.query(
    `SELECT u.id, u.keycloak_id AS "keycloakId", u.email, u.name, u.role, u.zip,
            u.service_radius_miles AS "serviceRadiusMiles",
            COALESCE(array_agg(sc.category_slug ORDER BY sc.category_slug)
                     FILTER (WHERE sc.category_slug IS NOT NULL), '{}') AS categories
     FROM users u
     LEFT JOIN servicer_categories sc ON sc.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [id],
  );
  return rows[0] ?? null;
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
