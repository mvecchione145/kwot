import { Agent, tool, type BaseModelConfig, type MessageData, type Model } from "@strands-agents/sdk";
import { z } from "zod";

export interface Category {
  slug: string;
  name: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const draftSchema = z.object({
  categorySlug: z.string().describe('Slug of the best-matching category, or "other"'),
  title: z.string().max(80).describe('Short title a servicer would recognize, e.g. "Flush irrigation system before winter"'),
  document: z.string().max(10_000).describe("The request document, in Markdown, following the template"),
});

export type RequestDraft = z.infer<typeof draftSchema>;

export interface ChatTurn {
  reply: string;
  draft: RequestDraft | null;
}

const DOCUMENT_GUIDE = `## The request document

kwōt is a marketplace where a customer posts a home-service need once and local servicers bid on it. Servicers read the request document to decide whether to bid and how to price the job. Write it like a short README for the job, in Markdown, using this template:

# <Title>

## Summary
One or two sentences on what the customer needs.

## What needs to be done
The work, in the customer's terms, organized into short paragraphs or bullets.

## About the property
Anything the customer mentioned about the site, equipment, or access.

## Timing
When the customer wants it done.

## Notes for servicers
Anything else useful: preferences, constraints, known problems.

Rules for the document:
- Include only what the customer actually said. Reorganize and tidy their wording, but never add facts, measurements, or assumptions they didn't give.
- Leave out any section the customer gave no information for. Never write placeholders like "Not specified".
- Write in the third person ("The customer needs…"), plainly, with no sales language.
- Never include a street address, phone number, email, or payment details, even if the customer mentions them.

To deliver the document, call the submit_request_draft tool with the category slug, the title, and the document.`;

function categoriesBlock(categories: Category[]): string {
  return `Categories (pick the best match, or "other"):\n${categories.map((c) => `- ${c.slug}: ${c.name}`).join("\n")}`;
}

function chatSystemPrompt(categories: Category[]): string {
  return `You are the kwōt intake assistant. A customer is telling you, in their own words, what they need done. Your job is to turn that into a request document.

Keep the conversation open-ended and short:
- Do not quiz the customer for specifics like measurements, sizes, counts, brands, or model numbers. Servicers can ask their own questions later.
- Ask a follow-up only if you can't tell what the job is. Otherwise ask at most one broad question, such as when they'd like it done and whether there's anything else a pro should know, and only if they haven't already covered that.
- Most conversations should finish within one to three customer messages. If the customer says they're done, write the document right away.
- If a message is unrelated to getting a service request posted, briefly steer back to the request.
- Once you have what you need, call submit_request_draft exactly once, then tell the customer in one sentence that their request is ready to review.

${DOCUMENT_GUIDE}

${categoriesBlock(categories)}`;
}

function writeSystemPrompt(categories: Category[]): string {
  return `You turn a customer's open-ended description of a home-service job into a request document. You get one message from the customer; do not ask questions. Call submit_request_draft exactly once with the finished document.

${DOCUMENT_GUIDE}

${categoriesBlock(categories)}`;
}

/** Removes any `<think>` block a reasoning model (e.g. Qwen3) leaves in its visible reply. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

const PLACEHOLDER_BODY = /^(none|n\/a|not specified|not provided|unknown|-)?\.?$/i;

/**
 * Tidies a document from a small local model: unescapes literal "\n" sequences and drops
 * sections whose body is empty or a placeholder like "None", which the prompt forbids but
 * small models still write.
 */
function cleanDocument(document: string): string {
  const sections = document.replace(/\\n/g, "\n").split(/^(?=## )/m);
  return sections
    .filter((section, i) => {
      if (i === 0 || !section.startsWith("## ")) return true;
      const body = section.split("\n").slice(1).join("\n").trim();
      return !PLACEHOLDER_BODY.test(body);
    })
    .join("")
    .trim();
}

/** Builds an agent whose submit_request_draft tool captures the draft it's given. */
function intakeAgent(
  model: Model<BaseModelConfig>,
  systemPrompt: string,
  categories: Category[],
  history: MessageData[] = [],
) {
  const knownSlugs = new Set(categories.map((c) => c.slug));
  const captured: { draft: RequestDraft | null } = { draft: null };
  const submitDraft = tool({
    name: "submit_request_draft",
    description:
      "Submit the request document once it's written. The customer reviews and can edit it before anything is published.",
    inputSchema: draftSchema,
    callback: (input) => {
      captured.draft = {
        ...input,
        // Small models sometimes invent a slug; anything unknown is filed under "other".
        categorySlug: knownSlugs.has(input.categorySlug) ? input.categorySlug : "other",
        document: cleanDocument(input.document),
      };
      return "Draft saved. The customer will now review it.";
    },
  });
  const agent = new Agent({ model, systemPrompt, tools: [submitDraft], messages: history, printer: false });
  return { agent, captured };
}

/**
 * Runs one intake chat turn. The conversation is stateless on this side: the caller
 * sends the full text history each time and the last message must be from the user.
 * With `finish`, the assistant writes the document from what it has instead of asking more.
 */
export async function runChatTurn(
  model: Model<BaseModelConfig>,
  categories: Category[],
  messages: ChatMessage[],
  finish = false,
): Promise<ChatTurn> {
  const last = messages.at(-1);
  if (!last || last.role !== "user") throw new Error("The last message must be from the user");

  const history: MessageData[] = messages.slice(0, -1).map((m) => ({ role: m.role, content: [{ text: m.text }] }));
  const { agent, captured } = intakeAgent(model, chatSystemPrompt(categories), categories, history);
  const prompt = finish
    ? `${last.text}\n\n(The customer tapped Done. Write the request document now from everything they've said.)`
    : last.text;

  const result = await agent.invoke(prompt);
  if (result.stopReason === "refusal") {
    return { reply: "Sorry, I can't help with that request. Could you describe the service you need?", draft: null };
  }
  return { reply: stripThinking(result.toString()), draft: captured.draft };
}

/** Writes a request document from a single open-ended description, without asking questions. */
export async function writeDocument(model: Model<BaseModelConfig>, categories: Category[], text: string): Promise<RequestDraft> {
  const { agent, captured } = intakeAgent(model, writeSystemPrompt(categories), categories);
  const result = await agent.invoke(text);
  if (!captured.draft) throw new Error(`No draft submitted (stopReason=${result.stopReason})`);
  return captured.draft;
}
