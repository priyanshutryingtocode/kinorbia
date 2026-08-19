import React from "react";

const TOKEN_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]*\]\([^)\s]+\))/g;

export function renderRichText(text: string): React.ReactNode[] {
  const parts = text.split(TOKEN_RE);
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(<strong key={key++}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      nodes.push(<em key={key++}>{part.slice(1, -1)}</em>);
    } else {
      const match = part.match(/^\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (match && /^https?:\/\//i.test(match[2])) {
        nodes.push(
          <a
            key={key++}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 underline hover:text-red-300"
          >
            {match[1] || match[2]}
          </a>
        );
      } else {
        nodes.push(part);
      }
    }
  }

  return nodes;
}