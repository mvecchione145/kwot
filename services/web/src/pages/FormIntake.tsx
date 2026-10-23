import { useEffect, useState } from "react";
import { api, TIMEFRAME_LABELS, type Category, type CategoryQuestion, type RequestDraft, type Timeframe } from "../api";
import { RequestReview } from "../components/RequestReview";

type Answers = Record<string, string>;

function QuestionInput({ q, value, onChange }: { q: CategoryQuestion; value: string; onChange: (v: string) => void }) {
  const options = q.type === "yes_no" ? ["Yes", "No"] : q.options;
  if ((q.type === "single_choice" || q.type === "yes_no") && options) {
    return (
      <div className="chips" role="radiogroup" aria-label={q.prompt}>
        {options.map((o) => (
          <button type="button" key={o} className={`chip ${value === o ? "selected" : ""}`} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "multi_choice" && options) {
    const selected = new Set(value ? value.split(", ") : []);
    const toggle = (o: string) => {
      selected.has(o) ? selected.delete(o) : selected.add(o);
      onChange(options.filter((x) => selected.has(x)).join(", "));
    };
    return (
      <div className="chips" aria-label={q.prompt}>
        {options.map((o) => (
          <button type="button" key={o} className={`chip ${selected.has(o) ? "selected" : ""}`} onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }
  return (
    <input
      aria-label={q.prompt}
      type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
      inputMode={q.type === "number" ? "numeric" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function FormIntake() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<"basics" | "details" | "when" | "review">("basics");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [timeframe, setTimeframe] = useState<Timeframe>("flexible");
  const [timeframeNotes, setTimeframeNotes] = useState("");

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const category = categories.find((c) => c.slug === slug);
  const questions = category?.questions ?? [];
  const missingRequired = questions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.id);

  const draft: RequestDraft = {
    categorySlug: slug,
    title: description.split(/[.!?\n]/)[0].slice(0, 80),
    description,
    details: questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({ questionId: q.id, question: q.prompt, answer: answers[q.id] })),
    timeframe,
    timeframeNotes: timeframeNotes || undefined,
    missingRequired,
  };

  if (step === "review") return <RequestReview draft={draft} onEdit={() => setStep("basics")} />;

  return (
    <section className="stack">
      {step === "basics" && (
        <>
          <h1>What do you need?</h1>
          <label className="field">
            <span>Category</span>
            <select value={slug} onChange={(e) => setSlug(e.target.value)}>
              <option value="">Choose one…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Describe the job</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button
            className="primary big"
            disabled={!slug || !description.trim()}
            onClick={() => setStep(questions.length ? "details" : "when")}
          >
            Next
          </button>
        </>
      )}
      {step === "details" && (
        <>
          <h1>A few details</h1>
          {questions.map((q) => (
            <div className="field" key={q.id}>
              <span>
                {q.prompt}
                {!q.required && <span className="muted"> (optional)</span>}
              </span>
              <QuestionInput q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
            </div>
          ))}
          <div className="row">
            <button className="secondary" onClick={() => setStep("basics")}>
              Back
            </button>
            <button className="primary" disabled={missingRequired.length > 0} onClick={() => setStep("when")}>
              Next
            </button>
          </div>
        </>
      )}
      {step === "when" && (
        <>
          <h1>When do you need it?</h1>
          <div className="chips" role="radiogroup" aria-label="Timeframe">
            {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((t) => (
              <button type="button" key={t} className={`chip ${timeframe === t ? "selected" : ""}`} onClick={() => setTimeframe(t)}>
                {TIMEFRAME_LABELS[t]}
              </button>
            ))}
          </div>
          {timeframe === "specific_dates" && (
            <label className="field">
              <span>Which dates?</span>
              <input value={timeframeNotes} onChange={(e) => setTimeframeNotes(e.target.value)} />
            </label>
          )}
          <div className="row">
            <button className="secondary" onClick={() => setStep(questions.length ? "details" : "basics")}>
              Back
            </button>
            <button className="primary" onClick={() => setStep("review")}>
              Review
            </button>
          </div>
        </>
      )}
    </section>
  );
}
