export type TriagePriority = "Low" | "Medium" | "High" | "Critical";

export type TriageRequest = {
  caseId?: string;
  noteText?: string;
};

export type TriageMetadata = {
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
  requestId: string;
};

export type TriageResult = {
  summary: string;
  priority: TriagePriority;
  tags: string[];
  confidence: number;
} & TriageMetadata;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const NOTE_MIN_LENGTH = 1000;
const NOTE_MAX_LENGTH = 5000;
const SUMMARY_MAX_LENGTH = 500;
const TAG_MIN = 3;
const TAG_MAX = 6;
const TAG_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const PRIORITIES: TriagePriority[] = ["Low", "Medium", "High", "Critical"];

export function validateTriageRequest(input: unknown): ValidationResult<TriageRequest> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const record = input as Record<string, unknown>;
  const caseId = typeof record.caseId === "string" ? record.caseId.trim() : undefined;
  const noteText =
    typeof record.noteText === "string" ? record.noteText.trim() : undefined;

  if (!caseId && !noteText) {
    return { ok: false, error: "Provide caseId or noteText." };
  }

  if (noteText) {
    if (noteText.length < NOTE_MIN_LENGTH || noteText.length > NOTE_MAX_LENGTH) {
      return {
        ok: false,
        error: `noteText must be between ${NOTE_MIN_LENGTH} and ${NOTE_MAX_LENGTH} characters.`,
      };
    }
  }

  return { ok: true, value: { caseId, noteText } };
}

export function validateTriageResult(input: unknown): ValidationResult<TriageResult> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid AI output." };
  }

  const record = input as Record<string, unknown>;
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const priority = record.priority as TriagePriority;
  const tags = Array.isArray(record.tags) ? record.tags : [];
  const confidence = typeof record.confidence === "number" ? record.confidence : NaN;

  const modelUsed = typeof record.modelUsed === "string" ? record.modelUsed : "";
  const promptVersion =
    typeof record.promptVersion === "string" ? record.promptVersion : "";
  const durationMs = typeof record.durationMs === "number" ? record.durationMs : NaN;
  const requestId = typeof record.requestId === "string" ? record.requestId : "";

  if (!summary || summary.length > SUMMARY_MAX_LENGTH) {
    return { ok: false, error: "Summary is missing or too long." };
  }

  if (!PRIORITIES.includes(priority)) {
    return { ok: false, error: "Priority is invalid." };
  }

  if (tags.length < TAG_MIN || tags.length > TAG_MAX) {
    return { ok: false, error: "Tags must be 3 to 6 items." };
  }

  const normalizedTags = tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim());

  if (normalizedTags.length !== tags.length) {
    return { ok: false, error: "Tags must be strings." };
  }

  if (!normalizedTags.every((tag) => tag === tag.toLowerCase() && TAG_PATTERN.test(tag))) {
    return { ok: false, error: "Tags must be lowercase snake_case." };
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    return { ok: false, error: "Confidence must be between 0 and 100." };
  }

  if (!modelUsed || !promptVersion || !requestId || !Number.isFinite(durationMs)) {
    return { ok: false, error: "Metadata fields are required." };
  }

  return {
    ok: true,
    value: {
      summary,
      priority,
      tags: normalizedTags,
      confidence,
      modelUsed,
      promptVersion,
      durationMs,
      requestId,
    },
  };
}
