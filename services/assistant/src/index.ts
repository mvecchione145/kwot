import express from "express";
import { z } from "zod";
import { runChatTurn, writeDocument } from "./intake-agent.js";
import { createModelSetup } from "./model.js";

const port = Number(process.env.PORT ?? 4100);
const { provider, modelId, model, available } = createModelSetup();

const categoriesSchema = z.array(z.object({ slug: z.string(), name: z.string() }));

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1) })).min(1),
  finish: z.boolean().optional(),
  categories: categoriesSchema,
});

const writeSchema = z.object({
  text: z.string().min(1),
  categories: categoriesSchema,
});

const app = express();
app.use(express.json({ limit: "200kb" }));

app.get("/health", async (_req, res) => {
  res.json({ status: "ok", enabled: await available(), provider, model: modelId });
});

app.post("/chat", async (req, res) => {
  if (!(await available())) {
    res.status(503).json({ error: "assistant_unavailable" });
    return;
  }
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { messages, finish, categories } = parsed.data;
  if (messages.at(-1)?.role !== "user") {
    res.status(400).json({ error: "last_message_must_be_user" });
    return;
  }
  try {
    res.json(await runChatTurn(model, categories, messages, finish));
  } catch (err) {
    console.error("chat turn failed", err);
    res.status(502).json({ error: "model_error" });
  }
});

app.post("/write", async (req, res) => {
  if (!(await available())) {
    res.status(503).json({ error: "assistant_unavailable" });
    return;
  }
  const parsed = writeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    res.json(await writeDocument(model, parsed.data.categories, parsed.data.text));
  } catch (err) {
    console.error("document write failed", err);
    res.status(502).json({ error: "model_error" });
  }
});

app.listen(port, () => {
  console.log(`kwōt assistant listening on :${port} (${provider}: ${modelId})`);
});
