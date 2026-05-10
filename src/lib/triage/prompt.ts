export function buildPrompt(noteText: string) {
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
