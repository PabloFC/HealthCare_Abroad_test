"use client";

import { useMemo, useState } from "react";

type TriageResponse = {
  caseId: string | null;
  summary: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  tags: string[];
  confidence: number;
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
  requestId: string;
};

const NOTE_MIN_LENGTH = 1000;
const NOTE_MAX_LENGTH = 5000;

export default function HomePage() {
  const [noteText, setNoteText] = useState("");
  const [caseId, setCaseId] = useState("");
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Pick<
    TriageResponse,
    "requestId" | "modelUsed" | "promptVersion" | "durationMs"
  > | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const noteLength = noteText.trim().length;
  const lengthStatus = useMemo(() => {
    if (noteLength === 0) return "Add the case note to begin.";
    if (noteLength < NOTE_MIN_LENGTH) {
      return `Add ${NOTE_MIN_LENGTH - noteLength} more characters.`;
    }
    if (noteLength > NOTE_MAX_LENGTH) {
      return `Remove ${noteLength - NOTE_MAX_LENGTH} characters.`;
    }
    return "Ready for analysis.";
  }, [noteLength]);

  const canSubmit =
    noteLength >= NOTE_MIN_LENGTH &&
    noteLength <= NOTE_MAX_LENGTH &&
    !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setMeta(null);

    const trimmedCaseId = caseId.trim();
    const requestCaseId = trimmedCaseId.length > 0 ? trimmedCaseId : "ad-hoc";
    const payload: { noteText: string; caseId?: string } = {
      noteText: noteText.trim(),
    };
    if (trimmedCaseId) {
      payload.caseId = trimmedCaseId;
    }

    try {
      const response = await fetch(
        `/api/admin/case-triage/${encodeURIComponent(requestCaseId)}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as
        | TriageResponse
        | {
            error: string;
            requestId?: string;
            modelUsed?: string;
            promptVersion?: string;
            durationMs?: number;
          };

      if (!response.ok) {
        setError(data.error ?? "Unexpected error.");
        setMeta({
          requestId: data.requestId ?? "unknown",
          modelUsed: data.modelUsed ?? "unknown",
          promptVersion: data.promptVersion ?? "unknown",
          durationMs: data.durationMs ?? 0,
        });
        return;
      }

      setResult(data as TriageResponse);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Admin triage console</p>
        <h1>Case Triage Assistant</h1>
        <p className="subtitle">
          Submit a case note to receive a structured triage summary, priority,
          and tags.
        </p>
      </header>

      <section className="panel">
        <form className="triage-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="case-id">Case ID (optional)</label>
            <input
              id="case-id"
              name="caseId"
              type="text"
              placeholder="case-3421"
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="note-text">Case note</label>
            <textarea
              id="note-text"
              name="noteText"
              rows={10}
              placeholder="Paste the full case note (1,000-5,000 characters)."
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
            />
            <div className="helper">
              <span>{lengthStatus}</span>
              <span className="counter">
                {noteLength} / {NOTE_MAX_LENGTH}
              </span>
            </div>
          </div>

          <button className="primary" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Analyzing..." : "Run triage analysis"}
          </button>
        </form>
      </section>

      {error && (
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
      )}

      {result && (
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
      )}
    </main>
  );
}
