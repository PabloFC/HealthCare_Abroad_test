import type { TriagePriority, TriageResult } from "@/lib/triageSchemas";

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

export function listRecentTriageEntries(limit = 20) {
  return entries.slice(0, limit);
}
