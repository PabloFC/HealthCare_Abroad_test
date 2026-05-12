import { validateTriageResult } from "@/lib/triageSchemas";
import { buildPrompt } from "@/lib/triage/prompt";
import { MODEL_USED, PROMPT_VERSION, simulateModelResponse } from "@/lib/triage/model";
import type { TriageAnalysisFailure, TriageAnalysisSuccess } from "@/lib/triage/types";

// Takes a medical case note and returns structured triage analysis with priority, summary, tags, and confidence
// Handles the full lifecycle: prompt building, AI invocation, response validation, and error handling
export async function analyzeCaseNote(
  noteText: string
): Promise<TriageAnalysisSuccess | TriageAnalysisFailure> {
  // Initialize request tracking: capture start time and generate unique request ID
  // These values are used for performance measurement and audit trail
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  
  // Build the AI prompt from the medical note
  // The prompt contains instructions, formatting requirements, and context for the model
  buildPrompt(noteText);

  try {
    // Send medical note to AI model for analysis
    // Returns JSON string with triage results (priority, summary, tags, confidence, etc.)
    const responseText = simulateModelResponse(noteText, {
      requestId,
      promptVersion: PROMPT_VERSION,
      durationMs: 0,
      modelUsed: MODEL_USED,
    });
    
    // Parse AI response from JSON string to JavaScript object
    const parsed = JSON.parse(responseText) as Record<string, unknown>;
    
    // Calculate actual elapsed time from start to completion
    const durationMs = Date.now() - startedAt;
    parsed.durationMs = durationMs;

    // Validate AI output against schema requirements
    // Checks: summary length, priority validity, tag count and format, confidence range, metadata fields
    const validation = validateTriageResult(parsed);
    
    // If validation fails, return structured error with diagnostic metadata
    // kind: "invalid_output" indicates AI response doesn't match expected format
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

    // Success case: return validated analysis result
    return { ok: true, value: validation.value };
  } catch (error) {
    // Handle any errors during AI analysis (network failures, JSON parsing errors, timeouts, etc.)
    // Calculates elapsed time even on failure for performance monitoring
    const durationMs = Date.now() - startedAt;
    
    // Return provider error with diagnostic metadata
    // kind: "provider_error" indicates issue with AI service/connection
    // This will result in HTTP 500 (Internal Server Error) response
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
