"use client";

import { useMemo, useState } from "react";
import { ErrorPanel } from "@/app/components/ErrorPanel";
import { ResultPanel } from "@/app/components/ResultPanel";
import { TriageForm } from "@/app/components/TriageForm";
import { useTriageAnalysis } from "@/hooks/useTriageAnalysis";
import { NOTE_MAX_LENGTH, NOTE_MIN_LENGTH } from "@/lib/triage/schemas";

export default function HomePage() {
  const [noteText, setNoteText] = useState("");
  const [caseId, setCaseId] = useState("");
  const [adminMode, setAdminMode] = useState(false);

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
    noteLength >= NOTE_MIN_LENGTH && noteLength <= NOTE_MAX_LENGTH;

  //You can activate this line to force errors and enable de button when it has less than 1000 characters
  // const canSubmit = noteLength <= NOTE_MAX_LENGTH;

  const { result, error, meta, isSubmitting, submit } = useTriageAnalysis({
    noteText,
    caseId,
    adminMode,
    canSubmit,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
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
        <TriageForm
          caseId={caseId}
          noteText={noteText}
          noteLength={noteLength}
          lengthStatus={lengthStatus}
          adminMode={adminMode}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          onCaseIdChange={setCaseId}
          onNoteTextChange={setNoteText}
          onAdminModeChange={setAdminMode}
          onSubmit={handleSubmit}
          noteMaxLength={NOTE_MAX_LENGTH}
        />
      </section>

      {error && <ErrorPanel error={error} meta={meta} />}

      {result && <ResultPanel result={result} />}
    </main>
  );
}
