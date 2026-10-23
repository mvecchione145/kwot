import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type ChatMessage, type RequestDraft } from "../api";
import { RequestReview } from "../components/RequestReview";

const GREETING = "Hi! Tell me what you need help with, like \"I need my irrigation system flushed.\"";

export function ChatIntake() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draft, sending]);

  async function send(text: string, finish = false) {
    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setFailed(false);
    try {
      const turn = await api.chat(next, finish);
      setMessages([...next, { role: "assistant", text: turn.reply }]);
      if (turn.draft) setDraft(turn.draft);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (text && !sending) void send(text);
  }

  return (
    <section className="chat">
      <ol className="messages" aria-live="polite">
        <li className="bubble assistant">{GREETING}</li>
        {messages.map((m, i) => (
          <li key={i} className={`bubble ${m.role}`}>
            {m.text}
          </li>
        ))}
        {sending && <li className="bubble assistant muted">Thinking…</li>}
      </ol>
      {failed && (
        <p className="error" role="alert">
          The assistant isn't responding.{" "}
          <Link
            to="/requests/new/write"
            state={{ text: messages.filter((m) => m.role === "user").map((m) => m.text).join("\n\n") }}
          >
            Write it out instead
          </Link>
        </p>
      )}
      {draft && <RequestReview draft={draft} onChange={setDraft} />}
      <div ref={endRef} />
      {!draft && (
        <form className="composer" onSubmit={onSubmit}>
          <input
            aria-label="Message"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          {messages.length > 0 && (
            <button type="button" className="secondary" disabled={sending} onClick={() => void send("That's all.", true)}>
              Done
            </button>
          )}
          <button className="primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      )}
    </section>
  );
}
