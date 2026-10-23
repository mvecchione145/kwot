import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type FeedRequest } from "../api";
import { RequestDocument } from "../components/RequestDocument";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

/** The full request document, as a servicer sees it (US-3.2). */
export function FeedDetail() {
  const { id = "" } = useParams();
  const [request, setRequest] = useState<FeedRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .feedRequest(id)
      .then(setRequest)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "This request is no longer open, or isn't in your area."
            : "Couldn't load this request.",
        ),
      );
  }, [id]);

  if (error) {
    return (
      <section className="stack">
        <p className="error">{error}</p>
        <Link to="/home">Back to open requests</Link>
      </section>
    );
  }
  if (!request) return <p className="muted center">Loading…</p>;

  return (
    <section className="stack">
      <Link to="/home">← Open requests</Link>
      <p className="muted">
        {request.categoryName} · {request.zip} ({request.distanceMiles} mi away)
        {request.biddingDeadline && ` · Bids close ${dateFormat.format(new Date(request.biddingDeadline))}`}
      </p>
      <article className="card">
        <RequestDocument document={request.document} />
      </article>
    </section>
  );
}
