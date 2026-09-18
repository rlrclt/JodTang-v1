"use client";

/**
 * Lightweight Markdown renderer for AI chat messages.
 * Supports: tables, bold, bullet lists, horizontal rules, newlines.
 * No external dependencies.
 */

import React from "react";

function parseTable(lines: string[]): React.ReactNode {
  // หาแถว header, separator, body
  const headerLine = lines[0];
  const bodyLines = lines.slice(2); // skip separator

  const parseCells = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

  const headers = parseCells(headerLine);
  const rows = bodyLines.map(parseCells);

  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border/60">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-left font-semibold text-text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={
                ri % 2 === 0
                  ? "bg-surface/40"
                  : "bg-transparent"
              }
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5">
                  {formatInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection: | xxx | xxx | followed by |---|---|
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\|?\s*[-:]+\s*\|/.test(lines[i + 1])
    ) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(
        <React.Fragment key={elements.length}>
          {parseTable(tableLines)}
        </React.Fragment>
      );
      continue;
    }

    // Horizontal rule: ━━━ or --- or ===
    if (/^[-━═]{3,}$/.test(line.trim())) {
      elements.push(
        <hr key={elements.length} className="my-2 border-border/40" />
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<br key={elements.length} />);
      i++;
      continue;
    }

    // Regular text line (with inline formatting)
    elements.push(
      <span key={elements.length} className="block">
        {formatInline(line)}
      </span>
    );
    i++;
  }

  return <>{elements}</>;
}
