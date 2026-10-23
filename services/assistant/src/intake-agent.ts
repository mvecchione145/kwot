import { Agent, tool, type MessageData } from "@strands-agents/sdk";
import { AnthropicModel } from "@strands-agents/sdk/models/anthropic";
import { z } from "zod";

export interface CategoryQuestion {
  id: string;
  prompt: string;
  type: string;
  options?: string[];
  required: boolean;
}

export interface Category {
  slug: string;
  name: string;
  questions: CategoryQuestion[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const draftSchema = z.object({
  categorySlug: z.string().describe("Slug of the best-matching category, or \"other\""),
  title: z.string().max(80).describe("Short title a servicer would recognize, e.g. \"Flush irrigation system (6 zones)\""),
  description: z.string().max(1_000).describe("Two to four plain-language sentences summarizing the job"),
  details: z
    .array(
      z.object({
        questionId: z.string().describe("The category question id, or a short snake_case id for extra details"),
        question: z.string(),
        answer: z.string(),
      }),
    )
    .describe("Every detail the customer gave, including answers to the category questions"),
  timeframe: z.enum(["asap", "within_week", "flexible", "specific_dates"]),
  timeframeNotes: z.string().optional().describe("Specific dates or constraints, if any"),
  missingRequired: z
    .array(z.string())
    .describe("Ids of required category questions still unanswered (only when the customer finished early)"),
});

export type RequestDraft = z.infer<typeof draftSchema>;

export interface IntakeTurn {
  reply: string;
  draft: RequestDraft | null;
}

function systemPrompt(categories: Category[]): string {
  return `You are the kwōt intake assistant. kwōt is a marketplace where a customer posts a home-service need once and local servicers bid on it. Your job is to turn the customer's description into a complete, well-structured request so servicers can bid without calling them first.

How to run the conversation:
- Work out which category fits from the list below. If none fits, use "other" and gather whatever details a servicer would need to price the job.
- Ask one short, friendly question at a time, in plain language. Skip anything the customer already told you.
- Cover the category's required questions and when they need the work done (as soon as possible, within a week, flexible, or specific dates). Aim to finish within about eight questions.
- Never ask for a street address, phone number, email, or payment details. Location is already known from their profile.
- If the customer says they're done (for example "that's all"), stop asking and submit with what you have, listing unanswered required question ids in missingRequired.
- If a message is unrelated to getting a service request posted, briefly steer back to the request.
- Once you have enough context, call submit_request_draft exactly once, then tell the customer in one or two sentences that their request is ready to review before it's published.

Categories (JSON):
${JSON.stringify(categories)}`;
}

export function createModel(apiKey: string, modelId: string): AnthropicModel {
  return new AnthropicModel({
    apiKey,
    modelId,
    maxTokens: 16_000,
    // Server-side fallback reroutes a safety-classifier refusal to another model
    // instead of failing the turn.
    betas: ["server-side-fallback-2026-07-01"],
    params: {
      fallbacks: "default",
      // Short conversational turns; low effort keeps latency down.
      output_config: { effort: "low" },
    },
  });
}

/**
 * Runs one intake turn. The conversation is stateless on this side: the caller
 * sends the full text history each time and the last message must be from the user.
 */
export async function runIntakeTurn(
  model: AnthropicModel,
  categories: Category[],
  messages: ChatMessage[],
): Promise<IntakeTurn> {
  const last = messages.at(-1);
  if (!last || last.role !== "user") throw new Error("The last message must be from the user");

  let draft: RequestDraft | null = null;
  const submitDraft = tool({
    name: "submit_request_draft",
    description:
      "Submit the structured service request once enough context has been gathered. The customer reviews it before anything is published.",
    inputSchema: draftSchema,
    callback: (input) => {
      draft = input;
      return "Draft saved. The customer will now review it.";
    },
  });

  const history: MessageData[] = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: [{ text: m.text }],
  }));

  const agent = new Agent({
    model,
    systemPrompt: systemPrompt(categories),
    tools: [submitDraft],
    messages: history,
    printer: false,
  });

  const result = await agent.invoke(last.text);
  if (result.stopReason === "refusal") {
    return { reply: "Sorry, I can't help with that request. Could you describe the service you need?", draft: null };
  }
  return { reply: result.toString().trim(), draft };
}
