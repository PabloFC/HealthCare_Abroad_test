// Core types
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

// Generic validation result type
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
