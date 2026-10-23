import { Link } from "react-router-dom";
import { useSession } from "../session";

export function Home() {
  const { me } = useSession();
  if (me?.role === "servicer") {
    return (
      <section className="stack">
        <h1>Open requests</h1>
        <p className="muted">Requests near {me.zip} that match your services will show up here.</p>
      </section>
    );
  }
  return (
    <section className="stack">
      <h1>Your requests</h1>
      <Link to="/requests/new" className="button primary big">
        New request
      </Link>
      <p className="muted">Requests you post will show up here.</p>
    </section>
  );
}
