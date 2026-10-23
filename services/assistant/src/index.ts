import express from "express";
import { z } from "zod";
import { createModel, runIntakeTurn } from "./intake-agent.js";

const port = Number(process.env.PORT ?? 4100);
const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const model = apiKey ? createModel(apiKey, process.env.ASSISTANT_MODEL || "claude-opus-5-5") : null;

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1) })).min(1),
  categories: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      questions: z.array(
        z.object({
          id: z.string(),
          prompt: z.string(),
          type: z.string(),
          options: z.array(z.string()).optional(),
          required: z.boolean(),
        }),
      ),
    }),
  ),
});

const app = express();
app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", enabled: model !== null });
});

app.post("/chat", async (req, res) => {
  if (!model) {
    res.status(503).json({ error: "assistant_disabled" });
    return;
  }
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  if (parsed.data.messages.at(-1)?.role !== "user") {
    res.status(400).json({ error: "last_message_must_be_user" });
    return;
  }
  try {
    res.json(await runIntakeTurn(model, parsed.data.categories, parsed.data.messages));
  } catch (err) {
    console.error("intake turn failed", err);
    res.status(502).json({ error: "model_error" });
  }
});

app.listen(port, () => {
  console.log(`kwōt assistant listening on :${port} (${model ? "enabled" : "disabled: no ANTHROPIC_API_KEY"})`);
});
