import type { TriagePriority, TriageResult } from "@/lib/triageSchemas";

// In-memory audit store for triage analysis results and errors
// Maintains a history of all AI analyses for debugging, monitoring, and compliance purposes
export type TriageStoreEntry = {
  id: string;
  caseId: string | null;
  summary?: string;
  priority?: TriagePriority;
  tags?: string[];
  confidence?: number;
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
  requestId: string;
  createdAt: string;
  status: "success" | "error";
  error?: string;
};

const entries: TriageStoreEntry[] = [];

// Creates a base entry with common metadata fields (id, timestamps, status)
// Used internally by recordTriageResult and recordTriageError functions
function createBaseEntry(params: {
  caseId?: string;
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
  requestId: string;
  status: "success" | "error";
}) {
  return {
    id: crypto.randomUUID(),
    caseId: params.caseId ?? null,
    modelUsed: params.modelUsed,
    promptVersion: params.promptVersion,
    durationMs: params.durationMs,
    requestId: params.requestId,
    createdAt: new Date().toISOString(),
    status: params.status,
  } satisfies TriageStoreEntry;
}

// Records a successful triage analysis result with all AI-generated fields (summary, priority, tags, confidence)
// Adds entry to the beginning of the store for easy access to recent results
export function recordTriageResult(result: TriageResult, caseId?: string) {
  const entry: TriageStoreEntry = {
    ...createBaseEntry({
      caseId,
      modelUsed: result.modelUsed,
      promptVersion: result.promptVersion,
      durationMs: result.durationMs,
      requestId: result.requestId,
      status: "success",
    }),
    summary: result.summary,
    priority: result.priority,
    tags: result.tags,
    confidence: result.confidence,
  };

  entries.unshift(entry);
  return entry;
}

// Records a failed triage analysis with error details for audit and debugging purposes
// Adds entry to the beginning of the store with status "error" and error message
export function recordTriageError(params: {
  caseId?: string;
  modelUsed: string;
  promptVersion: string;
  durationMs: number;
  requestId: string;
  error: string;
}) {
  const entry: TriageStoreEntry = {
    ...createBaseEntry({
      caseId: params.caseId,
      modelUsed: params.modelUsed,
      promptVersion: params.promptVersion,
      durationMs: params.durationMs,
      requestId: params.requestId,
      status: "error",
    }),
    error: params.error,
  };

  entries.unshift(entry);
  return entry;
}

// Returns the most recent triage entries (success and error) up to the specified limit (default 20)
// Useful for audit trails, debugging, and monitoring analysis history
export function listRecentTriageEntries(limit = 20) {
  return entries.slice(0, limit);
}
