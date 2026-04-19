'use client';

import React from 'react';

/**
 * Renders text with support for highlight syntax: ==text==
 * Converts it to <span class="passage-hl">text</span>
 */
export default function HighlightedText({ text = '' }) {
  if (typeof text !== 'string') return text;

  // Split by ==keyword==
  const parts = text.split(/(==[^=]+==)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('==') && part.endsWith('==')) {
          const content = part.slice(2, -2);
          return (
            <span key={i} className="passage-hl">
              {content}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
