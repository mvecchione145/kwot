import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, type RequestDraft } from "../api";
import { RequestReview } from "../components/RequestReview";

/** Resumes a saved draft on the review screen. */
export function EditDraft() {
  const { id = "" } = useParams();
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getRequest(id)
      .then((r) => {
        setStatus(r.status);
        setDraft({ categorySlug: r.categorySlug, title: r.title, document: r.document });
      })
      .catch(() => setFailed(true));
  }, [id]);

  if (failed) {
    return (
      <section className="stack">
        <p className="error">Couldn't load this draft.</p>
        <Link to="/home">Back to your requests</Link>
      </section>
    );
  }
  if (!draft) return <p className="muted center">Loading…</p>;
  // Only drafts can be edited; anything else goes back to its detail page.
  if (status !== "draft") return <Navigate to={`/requests/${id}`} replace />;

  return (
    <section className="stack">
      <Link to={`/requests/${id}`}>← Back</Link>
      <RequestReview draft={draft} onChange={setDraft} requestId={id} />
    </section>
  );
}
