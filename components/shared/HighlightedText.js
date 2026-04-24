'use client';

import React from 'react';

/**
 * Renders text with support for lightweight inline formatting:
 * ==text== for highlighted text and **text** for bold text.
 */
export default function HighlightedText({ text = '' }) {
  if (typeof text !== 'string') return text;

  const parts = text.split(/(==[^=]+==|\*\*[^*]+\*\*)/g);

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
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return <strong key={i}>{content}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
