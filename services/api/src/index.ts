import express from "express";
import { config } from "./config.js";
import { migrate, pool } from "./db.js";
import { assistantEnabled, assistantRouter } from "./routes/assistant.js";
import { categoriesRouter } from "./routes/categories.js";
import { meRouter } from "./routes/me.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});

app.get("/api/config", async (_req, res) => {
  res.json({ assistantEnabled: await assistantEnabled() });
});
app.use("/api/me", meRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/assistant", assistantRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

await migrate();
app.listen(config.port, () => {
  console.log(`kwōt API listening on :${config.port}`);
});
