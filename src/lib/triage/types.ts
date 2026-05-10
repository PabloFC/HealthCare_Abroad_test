import type { TriageResult } from "@/lib/triageSchemas";

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
