export function emailCandidates(emails: (string | null | undefined)[]): string[] {
  const candidates = new Set<string>();

  for (const email of emails) {
    if (typeof email !== "string") continue;
    const trimmed = email.trim();
    if (!trimmed) continue;
    candidates.add(trimmed);
    candidates.add(trimmed.toLowerCase());
  }

  return [...candidates];
}

export function emailMatch(email: string): { $in: string[] } {
  return { $in: emailCandidates([email]) };
}
