import { validateTriageResult, type TriageResult } from "@/lib/triageSchemas";

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

const PROMPT_VERSION = "v1";
const MODEL_USED = "mock-triage-v1";

function buildPrompt(noteText: string) {
  return [
    "You are a case triage assistant. Return ONLY valid JSON.",
    "Schema:",
    "{summary: string, priority: 'Low'|'Medium'|'High'|'Critical', tags: string[], confidence: number, modelUsed: string, promptVersion: string, durationMs: number, requestId: string}",
    "Rules:",
    "- summary under 500 chars",
    "- tags 3 to 6, lowercase snake_case",
    "- confidence 0-100",
    "Note:",
    noteText,
  ].join("\n");
}

function derivePriority(noteText: string) {
  const text = noteText.toLowerCase();
  if (text.includes("critical") || text.includes("life-threatening")) {
    return "Critical";
  }
  if (text.includes("urgent") || text.includes("immediate")) {
    return "High";
  }
  if (text.includes("follow up") || text.includes("follow-up")) {
    return "Medium";
  }
  return "Low";
}

function deriveTags(noteText: string) {
  const tags = new Set<string>([
    "case_review",
    "documentation_check",
    "needs_follow_up",
  ]);
  const text = noteText.toLowerCase();

  if (text.includes("insurance") || text.includes("coverage")) {
    tags.add("insurance_review");
  }
  if (text.includes("travel") || text.includes("overseas")) {
    tags.add("travel_related");
  }
  if (text.includes("surgery")) {
    tags.add("surgery_risk");
  }
  if (text.includes("payment") || text.includes("billing")) {
    tags.add("billing_follow_up");
  }

  return Array.from(tags).slice(0, 6);
}

function deriveSummary(noteText: string) {
  const trimmed = noteText.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "Summary unavailable.";
  }
  const snippet = trimmed.slice(0, 360);
  const sentenceEnd = snippet.search(/[.!?]/);
  if (sentenceEnd > 60) {
    return snippet.slice(0, sentenceEnd + 1);
  }
  return snippet;
}

function simulateModelResponse(
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

export async function analyzeCaseNote(
  noteText: string
): Promise<TriageAnalysisSuccess | TriageAnalysisFailure> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  buildPrompt(noteText);

  try {
    const responseText = simulateModelResponse(noteText, {
      requestId,
      promptVersion: PROMPT_VERSION,
      durationMs: 0,
      modelUsed: MODEL_USED,
    });
    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    const durationMs = Date.now() - startedAt;
    parsed.durationMs = durationMs;

    const validation = validateTriageResult(parsed);
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
        kind: "invalid_output",
        requestId,
        modelUsed: MODEL_USED,
        promptVersion: PROMPT_VERSION,
        durationMs,
      };
    }

    return { ok: true, value: validation.value };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    return {
      ok: false,
      error: error instanceof Error ? error.message : "AI provider error.",
      kind: "provider_error",
      requestId,
      modelUsed: MODEL_USED,
      promptVersion: PROMPT_VERSION,
      durationMs,
    };
  }
}
