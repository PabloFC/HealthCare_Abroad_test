import { describe, expect, it } from "vitest";
import { validateTriageRequest, validateTriageResult } from "@/lib/triageSchemas";

const baseMetadata = {
  modelUsed: "test-model",
  promptVersion: "v1",
  durationMs: 123,
  requestId: "req-123",
};

const baseResult = {
  summary: "Valid summary.",
  priority: "High",
  tags: ["risk_flag", "medical_need", "urgent_case"],
  confidence: 87,
  ...baseMetadata,
};

describe("validateTriageRequest", () => {
  it("rejects missing input", () => {
    const result = validateTriageRequest(null);
    expect(result.ok).toBe(false);
  });

  it("rejects noteText outside length bounds", () => {
    const result = validateTriageRequest({ noteText: "short" });
    expect(result.ok).toBe(false);
  });

  it("accepts noteText within length bounds", () => {
    const noteText = "a".repeat(1200);
    const result = validateTriageRequest({ noteText });
    expect(result.ok).toBe(true);
  });
});

describe("validateTriageResult", () => {
  it("accepts a valid result", () => {
    const result = validateTriageResult(baseResult);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid priority", () => {
    const result = validateTriageResult({ ...baseResult, priority: "Urgent" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid tag count", () => {
    const result = validateTriageResult({ ...baseResult, tags: ["only_one"] });
    expect(result.ok).toBe(false);
  });

  it("rejects confidence outside range", () => {
    const result = validateTriageResult({ ...baseResult, confidence: 150 });
    expect(result.ok).toBe(false);
  });
});
