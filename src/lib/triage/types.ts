import type { TriageResult, TriagePriority } from "./schemas";

export type TriageResponse = {
  caseId: string | null;
  summary: string;
  priority: TriagePriority;
  tags: string[];
  confidence: number;
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
  requestId: string;
};

export type TriageErrorResponse = {
  error: string;
  requestId?: string;
  modelUsed?: string;
  promptVersion?: string;
  durationMs?: number;
};

export type TriageAnalysisSuccess = { ok: true; value: TriageResult };

export type TriageAnalysisFailure = {
  ok: false;
  error: string;
  kind: "invalid_output" | "provider_error";
  requestId: string;
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
};
