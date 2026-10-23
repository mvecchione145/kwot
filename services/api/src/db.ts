import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../migrations");
const ZIP_CENTROIDS_CSV = path.resolve(import.meta.dirname, "../data/zip_centroids.csv");
// Arbitrary constant so concurrent API instances don't run migrations twice.
const MIGRATION_LOCK_ID = 74_001;

/** Applies any `migrations/*.sql` files that haven't run yet, in filename order. */
export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`Applied migration ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed`, { cause: err });
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

/** Loads US ZIP centroids (used for servicer radius matching) on first start. */
export async function seedZipCentroids(): Promise<void> {
  const { rows } = await pool.query<{ count: string }>("SELECT count(*) FROM zip_centroids");
  if (Number(rows[0].count) > 0) return;

  const zips: string[] = [];
  const lats: number[] = [];
  const lngs: number[] = [];
  for (const line of (await readFile(ZIP_CENTROIDS_CSV, "utf8")).split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [zip, lat, lng] = line.split(",");
    zips.push(zip);
    lats.push(Number(lat));
    lngs.push(Number(lng));
  }
  await pool.query(
    `INSERT INTO zip_centroids (zip, lat, lng)
     SELECT * FROM unnest($1::text[], $2::float8[], $3::float8[])
     ON CONFLICT DO NOTHING`,
    [zips, lats, lngs],
  );
  console.log(`Loaded ${zips.length} ZIP centroids`);
}
