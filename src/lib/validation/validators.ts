import type {
  TriageRequest,
  TriageResult,
  TriagePriority,
  ValidationResult,
} from "./types";

// Validation constants
export const NOTE_MIN_LENGTH = 1000;
export const NOTE_MAX_LENGTH = 5000;
const SUMMARY_MAX_LENGTH = 500;
const TAG_MIN = 3;
const TAG_MAX = 6;
// Regex pattern ensures tags are lowercase with snake_case format (e.g., "patient_info", "high_priority")
const TAG_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;
// Valid priority levels for medical case triage
const PRIORITIES: TriagePriority[] = ["Low", "Medium", "High", "Critical"];

// Validates incoming triage request: requires either caseId or noteText
export function validateTriageRequest(
  input: unknown
): ValidationResult<TriageRequest> {
  // Ensure input is a valid object
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const record = input as Record<string, unknown>;
  // Extract and trim caseId if provided
  const caseId =
    typeof record.caseId === "string" ? record.caseId.trim() : undefined;
  // Extract and trim noteText if provided
  const noteText =
    typeof record.noteText === "string" ? record.noteText.trim() : undefined;

  // At least one field (caseId or noteText) is required
  if (!caseId && !noteText) {
    return { ok: false, error: "Provide caseId or noteText." };
  }

  // If noteText is provided, validate its length
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

// Validates the AI-generated triage result ensuring all fields meet requirements
// Includes strict validation for summary, priority, tags, confidence, and metadata
export function validateTriageResult(
  input: unknown
): ValidationResult<TriageResult> {
  // Ensure AI output is a valid object
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid AI output." };
  }

  const record = input as Record<string, unknown>;
  // Extract AI-generated summary
  const summary =
    typeof record.summary === "string" ? record.summary.trim() : "";
  // Extract priority level assigned by AI
  const priority = record.priority as TriagePriority;
  // Extract categorization tags
  const tags = Array.isArray(record.tags) ? record.tags : [];
  // Extract confidence score (0-100)
  const confidence =
    typeof record.confidence === "number" ? record.confidence : NaN;

  // Extract metadata fields for audit trail
  const modelUsed =
    typeof record.modelUsed === "string" ? record.modelUsed : "";
  const promptVersion =
    typeof record.promptVersion === "string" ? record.promptVersion : "";
  const durationMs =
    typeof record.durationMs === "number" ? record.durationMs : NaN;
  const requestId =
    typeof record.requestId === "string" ? record.requestId : "";

  // Validate summary: must exist and not exceed max length
  if (!summary || summary.length > SUMMARY_MAX_LENGTH) {
    return { ok: false, error: "Summary is missing or too long." };
  }

  // Validate priority is one of the allowed values
  if (!PRIORITIES.includes(priority)) {
    return { ok: false, error: "Priority is invalid." };
  }

  // Validate tag count is within acceptable range
  if (tags.length < TAG_MIN || tags.length > TAG_MAX) {
    return { ok: false, error: "Tags must be 3 to 6 items." };
  }

  // Filter tags to strings and trim whitespace
  const normalizedTags = tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim());

  // Ensure all tags are strings
  if (normalizedTags.length !== tags.length) {
    return { ok: false, error: "Tags must be strings." };
  }

  // Validate each tag matches the snake_case pattern
  if (
    !normalizedTags.every(
      (tag) => tag === tag.toLowerCase() && TAG_PATTERN.test(tag)
    )
  ) {
    return { ok: false, error: "Tags must be lowercase snake_case." };
  }

  // Validate confidence score is a valid percentage (0-100)
  if (
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    return {
      ok: false,
      error: "Confidence must be between 0 and 100.",
    };
  }

  // Validate all required metadata fields for audit and reproducibility
  if (
    !modelUsed ||
    !promptVersion ||
    !requestId ||
    !Number.isFinite(durationMs)
  ) {
    return {
      ok: false,
      error: "Metadata fields are required.",
    };
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
