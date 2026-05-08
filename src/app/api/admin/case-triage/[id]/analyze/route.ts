import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth";
import { validateTriageRequest } from "@/lib/triageSchemas";

export async function POST(request: Request) {
  const permission = requireAdminPermission();

  if (!permission.ok) {
    return NextResponse.json(
      { error: permission.message },
      { status: permission.status }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateTriageRequest(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { noteText, caseId } = validation.value;

  if (!noteText) {
    // We do not have a DB layer yet, so caseId-only requests are rejected.
    return NextResponse.json(
      { error: "noteText is required until case lookup is implemented." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: "Triage analysis not implemented yet.",
      caseId: caseId ?? null,
    },
    { status: 501 }
  );
}
