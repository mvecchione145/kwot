import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type Category, type RequestDraft } from "../api";
import { RequestDocument } from "./RequestDocument";

/** The title is the document's first `# ` heading, so editing the document keeps them in sync. */
function titleFrom(document: string, fallback: string): string {
  const heading = document.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim().slice(0, 120) : fallback;
}

/**
 * Review screen for a request document, before it's published. With `requestId`, it edits
 * an existing draft; otherwise saving or publishing creates the request.
 */
export function RequestReview({
  draft,
  onChange,
  requestId,
}: {
  draft: RequestDraft;
  onChange: (draft: RequestDraft) => void;
  requestId?: string;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"saving" | "publishing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function save(publish: boolean) {
    setBusy(publish ? "publishing" : "saving");
    setError(null);
    try {
      let id = requestId;
      if (id) {
        await api.updateDraft(id, draft);
        if (publish) await api.publishDraft(id);
      } else {
        id = (await api.createRequest(draft, publish)).id;
      }
      navigate(`/requests/${id}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "This request can't be saved as it is. Check that it isn't empty."
          : "Something went wrong saving your request. Please try again.",
      );
      setBusy(null);
    }
  }

  const empty = !draft.document.trim();
  return (
    <article className="card stack">
      {draft.aiWritten === false && (
        <p className="muted">The assistant isn't available right now, so this uses your words as written.</p>
      )}
      {/* The AI picks the category; the customer can correct it. It decides which servicers see the request. */}
      <label className="field">
        <span className="muted">Category</span>
        <select value={draft.categorySlug} onChange={(e) => onChange({ ...draft, categorySlug: e.target.value })}>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {editing ? (
        <label className="field">
          <span>Request document (Markdown)</span>
          <textarea
            className="document-editor"
            rows={16}
            value={draft.document}
            onChange={(e) =>
              onChange({ ...draft, document: e.target.value, title: titleFrom(e.target.value, draft.title) })
            }
          />
        </label>
      ) : (
        <RequestDocument document={draft.document} />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="secondary" onClick={() => setEditing(!editing)} disabled={busy !== null}>
        {editing ? "Preview" : "Edit"}
      </button>
      <div className="row">
        <button className="secondary" onClick={() => void save(false)} disabled={busy !== null || empty}>
          {busy === "saving" ? "Saving…" : "Save draft"}
        </button>
        <button className="primary" onClick={() => void save(true)} disabled={busy !== null || empty}>
          {busy === "publishing" ? "Publishing…" : "Publish"}
        </button>
      </div>
    </article>
  );
}
