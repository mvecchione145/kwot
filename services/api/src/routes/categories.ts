import { Router } from "express";
import { pool } from "../db.js";

export const categoriesRouter = Router();

export async function listCategories() {
  const { rows } = await pool.query(
    "SELECT slug, name, questions FROM categories ORDER BY sort_order, name",
  );
  return rows;
}

categoriesRouter.get("/", async (_req, res) => {
  res.json(await listCategories());
});
