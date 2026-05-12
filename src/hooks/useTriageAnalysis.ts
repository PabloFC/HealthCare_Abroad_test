import { useCallback, useState } from "react";
import type { TriageErrorResponse, TriageResponse } from "@/lib/triageTypes";

// Extract metadata fields only (for debugging/tracking)
// Useful to preserve metadata even when an error occurs
export type TriageMeta = Pick<
  TriageResponse,
  "requestId" | "modelUsed" | "promptVersion" | "durationMs"
>;

export type UseTriageAnalysisParams = {
  noteText: string;
  caseId: string;
  adminMode: boolean;
  canSubmit: boolean;
};

export function useTriageAnalysis({
  noteText,
  caseId,
  adminMode,
  canSubmit,
}: UseTriageAnalysisParams) {
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TriageMeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async () => {
    // Guard: prevent duplicate submissions or submission before validation
    if (!canSubmit || isSubmitting) return;

    // Clear previous state before new submission
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setMeta(null);

    const trimmedCaseId = caseId.trim();
    // Use "ad-hoc" as URL parameter if caseId is empty (required by API route [id])
    const requestCaseId = trimmedCaseId.length > 0 ? trimmedCaseId : "ad-hoc";
    const payload: { noteText: string; caseId?: string } = {
      noteText: noteText.trim(),
    };

    // Include caseId in body only if provided
    if (trimmedCaseId) {
      payload.caseId = trimmedCaseId;
    }

    try {
      // Set up request headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add admin headers if needed (required by the API for authentication)
      if (adminMode) {
        headers["x-admin"] = "true";
        headers["x-permission"] = "triage:write";
      }

      const response = await fetch(
        `/api/admin/case-triage/${encodeURIComponent(requestCaseId)}/analyze`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as
        | TriageResponse
        | TriageErrorResponse;

      // Handle error response: status not OK and has "error" field
      if (!response.ok && "error" in data) {
        setError(data.error ?? "Unexpected error.");
        // Preserve metadata even on error for debugging
        setMeta({
          requestId: data.requestId ?? "unknown",
          modelUsed: data.modelUsed ?? "unknown",
          promptVersion: data.promptVersion ?? "unknown",
          durationMs: data.durationMs ?? 0,
        });
        return;
      }

      // Success: store the complete triage result
      setResult(data as TriageResponse);
    } catch (submitError) {
      // Network error, JSON parse error, or other runtime error
      setError(
        submitError instanceof Error ? submitError.message : "Request failed.",
      );
    } finally {
      // Always mark submission as complete
      setIsSubmitting(false);
    }
  }, [adminMode, canSubmit, caseId, isSubmitting, noteText]);

  return {
    result,
    error,
    meta,
    isSubmitting,
    submit,
  };
}
