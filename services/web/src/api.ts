import { keycloak, type Role } from "./auth";

export interface Me {
  id: string;
  email: string;
  name: string | null;
  role: Role | null;
  zip: string | null;
  /** Servicers only. */
  serviceRadiusMiles: number | null;
  categories: string[];
}

export const SERVICE_RADIUS_OPTIONS = [10, 25, 50, 100] as const;

export interface ServiceSettings {
  zip: string;
  categories: string[];
  radiusMiles: number;
}

/** An open request as a servicer sees it: no customer details. */
export interface FeedRequest {
  id: string;
  categorySlug: string;
  categoryName: string;
  title: string;
  document: string;
  zip: string;
  biddingDeadline: string | null;
  publishedAt: string;
  distanceMiles: number;
}

export interface Category {
  slug: string;
  name: string;
}

export interface RequestDraft {
  categorySlug: string;
  title: string;
  /** README-style Markdown document servicers read. */
  document: string;
  /** False when the assistant was unavailable and the customer's text was used as-is. */
  aiWritten?: boolean;
}

export type RequestStatus = "draft" | "open" | "closed" | "cancelled";

export interface ServiceRequest {
  id: string;
  categorySlug: string;
  categoryName: string;
  title: string;
  document: string;
  zip: string;
  status: RequestStatus;
  biddingDeadline: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  const body = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error ?? "request_failed");
  return body as T;
}

export const api = {
  config: () => request<{ assistantEnabled: boolean }>("/api/config"),
  me: () => request<Me>("/api/me"),
  onboard: (body: { role: "customer"; zip: string } | ({ role: "servicer" } & ServiceSettings)) =>
    request<Me>("/api/me/onboarding", { method: "POST", body: JSON.stringify(body) }),
  updateServices: (settings: ServiceSettings) =>
    request<Me>("/api/me/services", { method: "PUT", body: JSON.stringify(settings) }),
  categories: () => request<Category[]>("/api/categories"),
  chat: (messages: ChatMessage[], finish = false) =>
    request<{ reply: string; draft: RequestDraft | null }>("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ messages, finish }),
    }),
  write: (text: string) =>
    request<RequestDraft>("/api/assistant/write", { method: "POST", body: JSON.stringify({ text }) }),
  /** Creates a request from a reviewed draft: published, or saved as a draft. */
  createRequest: ({ categorySlug, title, document }: RequestDraft, publish: boolean) =>
    request<ServiceRequest>("/api/requests", {
      method: "POST",
      body: JSON.stringify({ categorySlug, title, document, publish }),
    }),
  updateDraft: (id: string, { categorySlug, title, document }: RequestDraft) =>
    request<ServiceRequest>(`/api/requests/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ categorySlug, title, document }),
    }),
  publishDraft: (id: string) =>
    request<ServiceRequest>(`/api/requests/${encodeURIComponent(id)}/publish`, { method: "POST" }),
  cancelRequest: (id: string) =>
    request<ServiceRequest>(`/api/requests/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  deleteDraft: (id: string) => request<null>(`/api/requests/${encodeURIComponent(id)}`, { method: "DELETE" }),
  myRequests: () => request<ServiceRequest[]>("/api/requests"),
  getRequest: (id: string) => request<ServiceRequest>(`/api/requests/${encodeURIComponent(id)}`),
  feed: (params: { category?: string; sort: "newest" | "deadline" }) => {
    const query = new URLSearchParams({ sort: params.sort, ...(params.category && { category: params.category }) });
    return request<FeedRequest[]>(`/api/feed?${query}`);
  },
  feedRequest: (id: string) => request<FeedRequest>(`/api/feed/${encodeURIComponent(id)}`),
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: "Draft",
  open: "Open for bids",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** The first paragraph of the document's "Summary" section, for list cards. */
export function documentSummary(document: string): string {
  const lines = document.split("\n");
  const start = lines.findIndex((line) => /^##\s+Summary\s*$/i.test(line));
  if (start === -1) return "";
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("#")) break;
    body.push(line);
  }
  return body.join("\n").trim().split(/\n\s*\n/)[0];
}
