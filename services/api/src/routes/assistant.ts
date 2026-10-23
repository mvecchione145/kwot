import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth.js";
import { config } from "../config.js";
import { listCategories } from "./categories.js";

export const assistantRouter = Router();

/** Whether the assistant service has a model configured. Cached briefly. */
let enabledCache: { value: boolean; at: number } | undefined;
export async function assistantEnabled(): Promise<boolean> {
  if (enabledCache && Date.now() - enabledCache.at < 30_000) return enabledCache.value;
  let value = false;
  try {
    const res = await fetch(`${config.assistantUrl}/health`, { signal: AbortSignal.timeout(2_000) });
    value = res.ok && ((await res.json()) as { enabled?: boolean }).enabled === true;
  } catch {
    value = false;
  }
  enabledCache = { value, at: Date.now() };
  return value;
}

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(4_000) }))
    .min(1)
    .max(40),
});

/**
 * Proxies a request-intake chat turn to the internal assistant service.
 * The browser never talks to the assistant (or the model API) directly.
 */
assistantRouter.post("/chat", requireAuth, requireRole("customer"), async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const upstream = await fetch(`${config.assistantUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: parsed.data.messages, categories: await listCategories() }),
      signal: AbortSignal.timeout(120_000),
    });
    res.status(upstream.status).json(await upstream.json());
  } catch (err) {
    console.error("assistant request failed", err);
    res.status(502).json({ error: "assistant_unavailable" });
  }
});
