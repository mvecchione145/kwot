import { TIMEFRAME_LABELS, type RequestDraft } from "../api";

export function RequestReview({ draft, onEdit }: { draft: RequestDraft; onEdit?: () => void }) {
  return (
    <article className="card stack">
      <h2>{draft.title}</h2>
      <p>{draft.description}</p>
      <dl className="details">
        {draft.details.map((d) => (
          <div key={d.questionId}>
            <dt>{d.question}</dt>
            <dd>{d.answer}</dd>
          </div>
        ))}
        <div>
          <dt>When</dt>
          <dd>
            {TIMEFRAME_LABELS[draft.timeframe]}
            {draft.timeframeNotes ? ` (${draft.timeframeNotes})` : ""}
          </dd>
        </div>
      </dl>
      {draft.missingRequired.length > 0 && (
        <p className="muted">Some details are still missing. Servicers may ask about them.</p>
      )}
      <div className="row">
        {onEdit && (
          <button className="secondary" onClick={onEdit}>
            Edit
          </button>
        )}
        {/* Publishing lands with the requests API (US-2.4). */}
        <button className="primary" disabled title="Coming soon">
          Publish
        </button>
      </div>
    </article>
  );
}
