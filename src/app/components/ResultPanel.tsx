import type { TriageResponse } from "@/lib/triageTypes";

type ResultPanelProps = {
  result: TriageResponse;
};

export function ResultPanel({ result }: ResultPanelProps) {
  return (
    <section className="panel status success">
      <div>
        <h2>Triage result</h2>
        <p className="summary">{result.summary}</p>
        <div className="pill-row">
          <span className="pill">Priority: {result.priority}</span>
          <span className="pill">Confidence: {result.confidence}%</span>
        </div>
        <div className="tags">
          {result.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="meta">
        <p>Case ID: {result.caseId ?? "none"}</p>
        <p>Request ID: {result.requestId}</p>
        <p>Model: {result.modelUsed}</p>
        <p>Prompt: {result.promptVersion}</p>
        <p>Duration: {result.durationMs} ms</p>
      </div>
    </section>
  );
}
