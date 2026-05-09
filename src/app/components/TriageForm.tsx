type TriageFormProps = {
  caseId: string;
  noteText: string;
  noteLength: number;
  lengthStatus: string;
  adminMode: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  onCaseIdChange: (value: string) => void;
  onNoteTextChange: (value: string) => void;
  onAdminModeChange: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  noteMaxLength: number;
};

export function TriageForm({
  caseId,
  noteText,
  noteLength,
  lengthStatus,
  adminMode,
  canSubmit,
  isSubmitting,
  onCaseIdChange,
  onNoteTextChange,
  onAdminModeChange,
  onSubmit,
  noteMaxLength,
}: TriageFormProps) {
  return (
    <form className="triage-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="case-id">Case ID (optional)</label>
        <input
          id="case-id"
          name="caseId"
          type="text"
          placeholder="case-3421"
          value={caseId}
          onChange={(event) => onCaseIdChange(event.target.value)}
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
          onChange={(event) => onNoteTextChange(event.target.value)}
        />
        <div className="helper">
          <span>{lengthStatus}</span>
          <span className="counter">
            {noteLength} / {noteMaxLength}
          </span>
        </div>
      </div>

      <div className="field">
        <label className="toggle">
          <input
            type="checkbox"
            checked={adminMode}
            onChange={(event) => onAdminModeChange(event.target.checked)}
          />
          <span>Admin mode (send auth headers)</span>
        </label>
        <p className="hint">
          This enables x-admin and x-permission headers for the demo.
        </p>
      </div>

      <button className="primary" type="submit" disabled={!canSubmit}>
        {isSubmitting ? "Analyzing..." : "Run triage analysis"}
      </button>
    </form>
  );
}
