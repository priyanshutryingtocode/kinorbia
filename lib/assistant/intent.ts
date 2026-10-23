
export function getReferencedTitle(prompt: string) {
  const quoted = prompt.match(/["“]([^"”]+)["”]/)?.[1];
  if (quoted) {
    return quoted.trim();
  }

  const likeMatch = prompt.match(/\b(?:like|similar to|after watching)\s+([a-z0-9 '&:.-]+?)(?:\s+but|\s+with|[,.!?]|$)/i)?.[1];
  return likeMatch?.trim() || "";
}

export function hasQualifier(prompt: string) {
  const qualifiers = /\b(?:but|with|that|yet|more|less|not|without|instead|rather|though|however)\b/i;
  return qualifiers.test(prompt);
}

export function isTvRequest(prompt: string) {
  return /\b(?:tv show|tv series|tv|series|show|shows|episode|season|bingewatch|binge-watch)\b/i.test(prompt);
}

