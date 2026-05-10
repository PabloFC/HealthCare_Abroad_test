import { validateTriageResult } from "@/lib/triageSchemas";
import { buildPrompt } from "@/lib/triage/prompt";
import { MODEL_USED, PROMPT_VERSION, simulateModelResponse } from "@/lib/triage/model";
import type { TriageAnalysisFailure, TriageAnalysisSuccess } from "@/lib/triage/types";

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
