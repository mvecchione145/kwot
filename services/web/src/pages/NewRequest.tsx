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
          <strong>Just tell us</strong>
          <span className="muted">Describe it in your own words and we'll ask the right questions.</span>
        </Link>
      )}
      <Link to="/requests/new/form" className="option-card">
        <strong>Fill out a form</strong>
        <span className="muted">Pick a category and answer a few quick questions.</span>
      </Link>
    </section>
  );
}
