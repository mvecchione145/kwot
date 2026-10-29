import { useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { api, type RequestDraft } from "../api";
import { RequestReview } from "../components/RequestReview";

const PLACEHOLDER =
  "e.g. My sprinkler system needs to be flushed and shut down before winter. A couple of heads in the back stopped popping up this summer. Any weekday works.";

export function WriteIntake() {
  // The chat page hands over what the customer typed if the assistant fails.
  const prefill = (useLocation().state as { text?: string } | null)?.text ?? "";
  const [text, setText] = useState(prefill);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<RequestDraft | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setWriting(true);
    setError(false);
    try {
      setDraft(await api.write(text));
    } catch {
      setError(true);
    } finally {
      setWriting(false);
    }
  }

  if (draft) return <RequestReview draft={draft} onChange={setDraft} />;

  return (
    <form className="stack" onSubmit={submit}>
      <h1>What do you need?</h1>
      <label className="field">
        <span className="muted">Describe it in your own words. We'll turn it into a request pros can bid on.</span>
        <textarea rows={8} placeholder={PLACEHOLDER} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </label>
      {error && (
        <p className="error" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
      <button className="primary big" disabled={writing || !text.trim()}>
        {writing ? "Writing your request…" : "Create request"}
      </button>
    </form>
  );
}
