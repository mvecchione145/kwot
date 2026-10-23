import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function NewRequest() {
  const [assistantEnabled, setAssistantEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .config()
      .then((c) => setAssistantEnabled(c.assistantEnabled))
      .catch(() => setAssistantEnabled(false));
  }, []);

  return (
    <section className="stack">
      <h1>What do you need help with?</h1>
      {assistantEnabled && (
        <Link to="/requests/new/chat" className="option-card">
          <strong>Talk it through</strong>
          <span className="muted">Chat with our assistant and it will write up the request for you.</span>
        </Link>
      )}
      <Link to="/requests/new/write" className="option-card">
        <strong>Write it out</strong>
        <span className="muted">Describe the job in your own words, as much or as little as you like.</span>
      </Link>
    </section>
  );
}
