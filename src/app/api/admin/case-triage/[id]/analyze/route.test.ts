import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const requireAdminPermission = vi.fn();
const analyzeCaseNote = vi.fn();
const recordTriageResult = vi.fn();
const recordTriageError = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAdminPermission: () => requireAdminPermission(),
}));

vi.mock("@/lib/triage/adapter", () => ({
  analyzeCaseNote: (...args: unknown[]) => analyzeCaseNote(...args),
}));

vi.mock("@/lib/triage/store", () => ({
  recordTriageResult: (...args: unknown[]) => recordTriageResult(...args),
  recordTriageError: (...args: unknown[]) => recordTriageError(...args),
}));

const validNoteText = "a".repeat(1200);
const successResult = {
  summary: "Patient needs follow up.",
  priority: "High",
  tags: ["case_review", "needs_follow_up", "documentation_check"],
  confidence: 82,
  modelUsed: "mock-triage-v1",
  promptVersion: "v1",
  durationMs: 123,
  requestId: "req-1",
};

describe("POST /api/admin/case-triage/[id]/analyze", () => {
  it("returns 403 when permission denied", async () => {
    analyzeCaseNote.mockReset();
    requireAdminPermission.mockReturnValueOnce({
      ok: false,
      status: 403,
      message: "Forbidden",
    });

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ noteText: validNoteText }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Forbidden");
  });

  it("returns 400 for invalid JSON", async () => {
    analyzeCaseNote.mockReset();
    requireAdminPermission.mockReturnValueOnce({ ok: true, status: 200, message: "ok" });

    const request = new Request("http://localhost", {
      method: "POST",
      body: "{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid JSON body.");
  });

  it("returns 400 for invalid input", async () => {
    analyzeCaseNote.mockReset();
    requireAdminPermission.mockReturnValueOnce({ ok: true, status: 200, message: "ok" });

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ noteText: "short" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("noteText must be between");
  });

  it("returns 400 when noteText is missing", async () => {
    analyzeCaseNote.mockReset();
    requireAdminPermission.mockReturnValueOnce({ ok: true, status: 200, message: "ok" });

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ caseId: "case-123" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe(
      "noteText is required until case lookup is implemented."
    );
  });

  it("returns 422 when AI output is invalid", async () => {
    requireAdminPermission.mockReturnValueOnce({ ok: true, status: 200, message: "ok" });
    analyzeCaseNote.mockResolvedValueOnce({
      ok: false,
      error: "Priority is invalid.",
      kind: "invalid_output",
      requestId: "req-2",
      modelUsed: "mock-triage-v1",
      promptVersion: "v1",
      durationMs: 45,
    });

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ noteText: validNoteText }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toBe("Priority is invalid.");
    expect(recordTriageError).toHaveBeenCalledTimes(1);
  });

  it("returns 200 with a valid analysis", async () => {
    requireAdminPermission.mockReturnValueOnce({ ok: true, status: 200, message: "ok" });
    analyzeCaseNote.mockResolvedValueOnce({ ok: true, value: successResult });

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ noteText: validNoteText }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary).toBe(successResult.summary);
    expect(payload.priority).toBe(successResult.priority);
    expect(recordTriageResult).toHaveBeenCalledTimes(1);
  });
});
