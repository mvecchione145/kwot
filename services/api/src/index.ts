import express from "express";
import { config } from "./config.js";
import { migrate, pool, seedZipCentroids } from "./db.js";
import { assistantEnabled, assistantRouter } from "./routes/assistant.js";
import { categoriesRouter } from "./routes/categories.js";
import { feedRouter } from "./routes/feed.js";
import { meRouter } from "./routes/me.js";
import { closeExpiredRequests, requestsRouter } from "./routes/requests.js";

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
app.use("/api/requests", requestsRouter);
app.use("/api/feed", feedRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

await migrate();
await seedZipCentroids();

// Requests close at their bidding deadline (the feed also filters on the deadline, so
// nothing past it is shown between runs).
async function closeExpired() {
  try {
    const closed = await closeExpiredRequests();
    if (closed > 0) console.log(`Closed ${closed} request(s) past their bidding deadline`);
  } catch (err) {
    console.error("closing expired requests failed", err);
  }
}
await closeExpired();
setInterval(closeExpired, 60_000);

app.listen(config.port, () => {
  console.log(`kwōt API listening on :${config.port}`);
});
