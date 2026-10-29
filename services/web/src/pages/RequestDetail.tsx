import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, STATUS_LABELS, type ServiceRequest } from "../api";
import { RequestDocument } from "../components/RequestDocument";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

export function RequestDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  // In-page confirmation instead of a browser dialog.
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRequest(id)
      .then(setRequest)
      .catch((err) =>
        setError(err instanceof ApiError && err.status === 404 ? "Request not found." : "Couldn't load this request."),
      );
  }, [id]);

  async function confirm() {
    setBusy(true);
    setActionError(null);
    try {
      if (confirming === "delete") {
        await api.deleteDraft(id);
        navigate("/home", { replace: true });
        return;
      }
      setRequest(await api.cancelRequest(id));
      setConfirming(null);
    } catch {
      setActionError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <section className="stack">
        <p className="error">{error}</p>
        <Link to="/home">Back to your requests</Link>
      </section>
    );
  }
  if (!request) return <p className="muted center">Loading…</p>;

  return (
    <section className="stack">
      <Link to="/home">← Your requests</Link>
      <div className="meta">
        <span className={`badge ${request.status}`}>{STATUS_LABELS[request.status]}</span>
        <span className="muted">
          {request.categoryName} · {request.zip}
          {request.status === "open" &&
            request.biddingDeadline &&
            ` · Bids close ${dateFormat.format(new Date(request.biddingDeadline))}`}
        </span>
      </div>
      <article className="card">
        <RequestDocument document={request.document} />
      </article>
      {request.status === "open" && <p className="muted">Servicers in your area can now see this request and send bids.</p>}
      {request.status === "draft" && <p className="muted">This draft isn't visible to servicers until you publish it.</p>}

      {confirming ? (
        <div className="card stack" role="alertdialog" aria-labelledby="confirm-title">
          <p id="confirm-title">
            {confirming === "cancel"
              ? "Cancel this request? Servicers will no longer see it, and this can't be undone."
              : "Delete this draft? This can't be undone."}
          </p>
          {actionError && <p className="error">{actionError}</p>}
          <div className="row">
            <button className="secondary" onClick={() => setConfirming(null)} disabled={busy}>
              Keep it
            </button>
            <button className="danger" onClick={() => void confirm()} disabled={busy}>
              {busy ? "Working…" : confirming === "cancel" ? "Cancel request" : "Delete draft"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {request.status === "draft" && (
            <div className="row">
              <button className="secondary" onClick={() => setConfirming("delete")}>
                Delete
              </button>
              <Link to={`/requests/${request.id}/edit`} className="button primary">
                Continue editing
              </Link>
            </div>
          )}
          {request.status === "open" && (
            <button className="secondary" onClick={() => setConfirming("cancel")}>
              Cancel request
            </button>
          )}
        </>
      )}
    </section>
  );
}
