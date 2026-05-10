export function derivePriority(noteText: string) {
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

export function deriveTags(noteText: string) {
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

export function deriveSummary(noteText: string) {
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
