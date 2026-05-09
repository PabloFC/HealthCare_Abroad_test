import { useCallback, useState } from "react";
import type { TriageErrorResponse, TriageResponse } from "@/lib/triageTypes";

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
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setMeta(null);

    const trimmedCaseId = caseId.trim();
    const requestCaseId = trimmedCaseId.length > 0 ? trimmedCaseId : "ad-hoc";
    const payload: { noteText: string; caseId?: string } = {
      noteText: noteText.trim(),
    };

    if (trimmedCaseId) {
      payload.caseId = trimmedCaseId;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

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

      if (!response.ok && "error" in data) {
        setError(data.error ?? "Unexpected error.");
        setMeta({
          requestId: data.requestId ?? "unknown",
          modelUsed: data.modelUsed ?? "unknown",
          promptVersion: data.promptVersion ?? "unknown",
          durationMs: data.durationMs ?? 0,
        });
        return;
      }

      setResult(data as TriageResponse);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Request failed.",
      );
    } finally {
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
