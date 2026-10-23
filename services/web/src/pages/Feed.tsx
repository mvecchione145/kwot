import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, documentSummary, type Category, type FeedRequest } from "../api";
import { useSession } from "../session";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** Servicer home: open requests in their trades and area (US-3.1). */
export function Feed() {
  const { me } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"newest" | "deadline">("newest");
  const [requests, setRequests] = useState<FeedRequest[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setFailed(false);
    api
      .feed({ category: category || undefined, sort })
      .then(setRequests)
      .catch(() => setFailed(true));
  }, [category, sort]);

  const myCategories = categories.filter((c) => me?.categories.includes(c.slug));

  return (
    <section className="stack">
      <h1>Open requests</h1>
      <p className="muted">
        Within {me?.serviceRadiusMiles} miles of {me?.zip}. <Link to="/services">Edit your services</Link>
      </p>
      <div className="row">
        <label className="field">
          <span className="muted">Service</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All my services</option>
            {myCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "deadline")}>
            <option value="newest">Newest</option>
            <option value="deadline">Closing soonest</option>
          </select>
        </label>
      </div>
      {failed ? (
        <p className="error">Couldn't load open requests.</p>
      ) : !requests ? (
        <p className="muted">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="muted">No open requests match your services and area right now.</p>
      ) : (
        <ul className="request-list">
          {requests.map((r) => (
            <li key={r.id}>
              <Link to={`/feed/${r.id}`} className="option-card">
                <strong>{r.title}</strong>
                {documentSummary(r.document) && <span>{documentSummary(r.document)}</span>}
                <span className="muted">
                  {r.categoryName} · {r.zip} ({r.distanceMiles} mi) · Posted {dateFormat.format(new Date(r.publishedAt))}
                  {r.biddingDeadline && ` · Closes ${dateFormat.format(new Date(r.biddingDeadline))}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
