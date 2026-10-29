import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, STATUS_LABELS, type ServiceRequest } from "../api";
import { useSession } from "../session";
import { Feed } from "./Feed";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function CustomerRequests() {
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .myRequests()
      .then(setRequests)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="error">Couldn't load your requests.</p>;
  if (!requests) return <p className="muted">Loading…</p>;
  if (requests.length === 0) return <p className="muted">Requests you post will show up here.</p>;

  return (
    <ul className="request-list">
      {requests.map((r) => (
        <li key={r.id}>
          <Link to={`/requests/${r.id}`} className="option-card">
            <strong>{r.title}</strong>
            <span className="muted">
              <span className={`badge ${r.status}`}>{STATUS_LABELS[r.status]}</span> {r.categoryName} ·{" "}
              {dateFormat.format(new Date(r.publishedAt ?? r.createdAt))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Home() {
  const { me } = useSession();
  if (me?.role === "servicer") return <Feed />;
  return (
    <section className="stack">
      <h1>Your requests</h1>
      <Link to="/requests/new" className="button primary big">
        New request
      </Link>
      <CustomerRequests />
    </section>
  );
}
