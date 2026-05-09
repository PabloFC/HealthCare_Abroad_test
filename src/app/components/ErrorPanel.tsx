import type { TriageMeta } from "@/hooks/useTriageAnalysis";

type ErrorPanelProps = {
  error: string;
  meta: TriageMeta | null;
};

export function ErrorPanel({ error, meta }: ErrorPanelProps) {
  return (
    <section className="panel status error">
      <div>
        <h2>Analysis failed</h2>
        <p>{error}</p>
      </div>
      {meta && (
        <div className="meta">
          <p>Request ID: {meta.requestId}</p>
          <p>Model: {meta.modelUsed}</p>
          <p>Prompt: {meta.promptVersion}</p>
          <p>Duration: {meta.durationMs} ms</p>
        </div>
      )}
    </section>
  );
}
