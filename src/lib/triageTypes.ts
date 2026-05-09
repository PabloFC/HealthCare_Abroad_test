import type { TriagePriority } from "@/lib/triageSchemas";

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
