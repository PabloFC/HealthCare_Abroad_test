import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth";
import { analyzeCaseNote } from "@/lib/triage/service";
import { recordTriageError, recordTriageResult } from "@/lib/triageStore";
import { validateTriageRequest } from "@/lib/triageSchemas";

export async function POST(request: Request) {
  // This ensures only authorized administrators can submit triage analyses
  const permission = requireAdminPermission(request);

  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.message },
      { status: permission.status }
    );
  }

  // Safe parsing with error handling for malformed JSON
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Ensures caseId or noteText is provided with correct types and constraints
  const validation = validateTriageRequest(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { noteText, caseId } = validation.value;

  // Temporary constraint: noteText is required (until case lookup from DB is implemented)
  if (!noteText) {
    // We do not have a DB layer yet, so caseId-only requests are rejected.
    return NextResponse.json(
      { error: "noteText is required until case lookup is implemented." },
      { status: 400 }
    );
  }

  // The AI generates a priority level, summary, categorization tags, and confidence score
  const analysis = await analyzeCaseNote(noteText);

  if (!analysis.ok) {
    recordTriageError({
      caseId,
      modelUsed: analysis.modelUsed,
      promptVersion: analysis.promptVersion,
      durationMs: analysis.durationMs,
      requestId: analysis.requestId,
      error: analysis.error,
    });

    // Return error response with diagnostic metadata
    // 422: AI returned invalid/unparseable output
    // 500: Server-side error (API timeout, rate limit, etc.)
    return NextResponse.json(
      {
        error: analysis.error,
        modelUsed: analysis.modelUsed,
        promptVersion: analysis.promptVersion,
        durationMs: analysis.durationMs,
        requestId: analysis.requestId,
      },
      { status: analysis.kind === "invalid_output" ? 422 : 500 }
    );
  }

  // Record analysis result in audit store
  recordTriageResult(analysis.value, caseId);

  //Return successful response with full AI analysis
  // Includes: summary, priority, tags, confidence, modelUsed, promptVersion, durationMs, requestId
  return NextResponse.json(
    {
      caseId: caseId ?? null,
      ...analysis.value,
    },
    { status: 200 }
  );
}
