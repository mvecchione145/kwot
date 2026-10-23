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

/** Forwards a JSON body to the internal assistant service, adding the category list. */
async function callAssistant(path: string, body: object): Promise<{ status: number; json: unknown }> {
  const upstream = await fetch(`${config.assistantUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, categories: await listCategories() }),
    // Local models can be slow, especially on first load.
    signal: AbortSignal.timeout(300_000),
  });
  return { status: upstream.status, json: await upstream.json() };
}

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(4_000) }))
    .min(1)
    .max(40),
  finish: z.boolean().optional(),
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
    const { status, json } = await callAssistant("/chat", parsed.data);
    res.status(status).json(json);
  } catch (err) {
    console.error("assistant request failed", err);
    res.status(502).json({ error: "assistant_unavailable" });
  }
});

const writeSchema = z.object({
  text: z.string().trim().min(1).max(8_000),
});

/** The customer's own words, as-is, for when the assistant is off or fails. */
function verbatimDraft(text: string) {
  const title = titleFromText(text);
  return { categorySlug: "other", title, document: `# ${title}\n\n${text}\n`, aiWritten: false };
}

/** The first sentence, shortened at a word boundary if it's long. */
function titleFromText(text: string): string {
  const first = text
    .trim()
    .split(/(?<=[.!?])\s+|\n/)[0]
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!first) return "New request";
  if (first.length <= 80) return first;
  const cut = first.slice(0, 80);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : 80)}…`;
}

/** Turns an open-ended description into a request document. */
assistantRouter.post("/write", requireAuth, requireRole("customer"), async (req, res) => {
  const parsed = writeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  if (await assistantEnabled()) {
    try {
      const { status, json } = await callAssistant("/write", parsed.data);
      if (status === 200) {
        res.json({ ...(json as object), aiWritten: true });
        return;
      }
      console.error("assistant write failed", status, json);
    } catch (err) {
      console.error("assistant write failed", err);
    }
  }
  res.json(verbatimDraft(parsed.data.text));
});
