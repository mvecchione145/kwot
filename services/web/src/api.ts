import { keycloak, type Role } from "./auth";

export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: Role | null;
  zip: string | null;
}

export interface CategoryQuestion {
  id: string;
  prompt: string;
  type: "single_choice" | "multi_choice" | "number" | "date" | "text" | "yes_no";
  options?: string[];
  required: boolean;
}

export interface Category {
  slug: string;
  name: string;
  questions: CategoryQuestion[];
}

export type Timeframe = "asap" | "within_week" | "flexible" | "specific_dates";

export interface RequestDraft {
  categorySlug: string;
  title: string;
  description: string;
  details: { questionId: string; question: string; answer: string }[];
  timeframe: Timeframe;
  timeframeNotes?: string;
  missingRequired: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`${status} ${code}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);
    headers.set("Authorization", `Bearer ${keycloak.token}`);
  }
  if (init.body) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? "request_failed");
  return body as T;
}

export const api = {
  config: () => request<{ assistantEnabled: boolean }>("/api/config"),
  me: () => request<Me>("/api/me"),
  onboard: (role: Role, zip: string) =>
    request<Me>("/api/me/onboarding", { method: "POST", body: JSON.stringify({ role, zip }) }),
  categories: () => request<Category[]>("/api/categories"),
  chat: (messages: ChatMessage[]) =>
    request<{ reply: string; draft: RequestDraft | null }>("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),
};

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  asap: "As soon as possible",
  within_week: "Within a week",
  flexible: "Flexible",
  specific_dates: "Specific dates",
};
