import { derivePriority, deriveSummary, deriveTags } from "@/lib/triage/triageRules";

export const PROMPT_VERSION = "v1";
export const MODEL_USED = "mock-triage-v1";

export function simulateModelResponse(
  noteText: string,
  metadata: {
    requestId: string;
    promptVersion: string;
    durationMs: number;
    modelUsed: string;
  }
) {
  const response = {
    summary: deriveSummary(noteText),
    priority: derivePriority(noteText),
    tags: deriveTags(noteText),
    confidence: 84,
    modelUsed: metadata.modelUsed,
    promptVersion: metadata.promptVersion,
    durationMs: metadata.durationMs,
    requestId: metadata.requestId,
  };

  return JSON.stringify(response);
}
