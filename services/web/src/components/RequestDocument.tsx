import Markdown from "react-markdown";

/** Renders a request document the way servicers see it. */
export function RequestDocument({ document }: { document: string }) {
  return (
    <div className="document">
      <Markdown>{document}</Markdown>
    </div>
  );
}
