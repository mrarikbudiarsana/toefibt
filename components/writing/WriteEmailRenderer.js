'use client';
import { useMemo, useRef, useState } from 'react';

function parseWriteEmailMeta(prompt, context, options) {
  const rawOptions = Array.isArray(options) ? options : [];
  const scenario = String(rawOptions[0] ?? context ?? '').trim();
  let to = String(rawOptions[1] ?? '').trim();
  let subject = String(rawOptions[2] ?? '').trim();

  const combined = `${context || ''}\n${prompt || ''}`;
  const toMatch = combined.match(/^\s*to\s*:\s*(.+)$/im);
  const subjectMatch = combined.match(/^\s*subject\s*:\s*(.+)$/im);

  if (!to && toMatch?.[1]) to = toMatch[1].trim();
  if (!subject && subjectMatch?.[1]) subject = subjectMatch[1].trim();

  return {
    scenario,
    to: to || 'editor@example.com',
    subject: subject || 'Question about online submission',
  };
}

function splitPrompt(prompt) {
  const lines = String(prompt || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const bullets = [];
  const intro = [];

  lines.forEach(line => {
    if (/^[-*•]/.test(line)) {
      bullets.push(line.replace(/^[-*•]\s*/, '').trim());
      return;
    }
    intro.push(line);
  });

  return { intro, bullets };
}

export default function WriteEmailRenderer({
  prompt = '',
  context = '',
  options = [],
  value = '',
  onChange,
  questionNumber,
  totalQuestions,
}) {
  const textareaRef = useRef(null);
  const [showWordCount, setShowWordCount] = useState(true);
  const safeOnChange = typeof onChange === 'function' ? onChange : () => {};
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const safeQuestionNumber = Number.isFinite(questionNumber) && questionNumber > 0 ? questionNumber : 1;
  const safeTotalQuestions = Number.isFinite(totalQuestions) && totalQuestions > 0
    ? Math.max(totalQuestions, safeQuestionNumber)
    : safeQuestionNumber;

  const meta = useMemo(() => parseWriteEmailMeta(prompt, context, options), [prompt, context, options]);
  const promptParts = useMemo(() => splitPrompt(prompt), [prompt]);

  function replaceSelection(replacement) {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    safeOnChange(nextValue);

    requestAnimationFrame(() => {
      const pos = start + replacement.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleCut() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const selected = value.slice(start, end);

    try {
      await navigator.clipboard.writeText(selected);
    } catch {
      // Ignore clipboard errors in restricted browsers.
    }

    const nextValue = `${value.slice(0, start)}${value.slice(end)}`;
    safeOnChange(nextValue);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start);
    });
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) replaceSelection(text);
    } catch {
      // Ignore clipboard errors in restricted browsers.
    }
  }

  function handleUndo() {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('undo');
  }

  function handleRedo() {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('redo');
  }

  return (
    <div className="split-layout">
      <div className="split-pane split-pane--left">
        <div className="split-pane__label">Writing Task {safeQuestionNumber} of {safeTotalQuestions}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: '#ecfeff', color: '#0d8b93', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
          Time limit: 7 minutes
        </div>

        <div style={{ fontSize: 14, color: '#111', lineHeight: 1.65 }}>
          {meta.scenario ? (
            <p style={{ marginBottom: 14 }}>{meta.scenario}</p>
          ) : (
            <p style={{ marginBottom: 14 }}>
              Read the situation and write an email response.
            </p>
          )}

          {promptParts.intro.length > 0 && (
            <p style={{ marginBottom: 10 }}>{promptParts.intro.join(' ')}</p>
          )}

          {promptParts.bullets.length > 0 && (
            <ul style={{ margin: '0 0 14px 18px' }}>
              {promptParts.bullets.map((bullet, index) => (
                <li key={index} style={{ marginBottom: 6 }}>{bullet}</li>
              ))}
            </ul>
          )}

          <p style={{ marginBottom: 0 }}>
            Write as much as you can and in complete sentences.
          </p>
        </div>
      </div>

      <div className="split-pane split-pane--right" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '18px 20px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="split-pane__label" style={{ margin: 0 }}>Your Response</div>
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: '#111', lineHeight: 1.45 }}>
            To: {meta.to}
          </div>
          <div style={{ marginTop: 2, fontSize: 14, fontWeight: 700, color: '#111', lineHeight: 1.45 }}>
            Subject: {meta.subject}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-light)', background: '#f8fafc' }}>
          <button
            type="button"
            style={{ border: 'none', borderRadius: 6, padding: '5px 12px', background: '#0d8b93', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            onClick={handleCut}
          >
            Cut
          </button>
          <button
            type="button"
            style={{ border: 'none', borderRadius: 6, padding: '5px 12px', background: '#e5e7eb', color: '#111827', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onClick={handlePaste}
          >
            Paste
          </button>
          <button
            type="button"
            style={{ border: 'none', borderRadius: 6, padding: '5px 12px', background: '#e5e7eb', color: '#111827', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onClick={handleUndo}
          >
            Undo
          </button>
          <button
            type="button"
            style={{ border: 'none', borderRadius: 6, padding: '5px 12px', background: '#e5e7eb', color: '#111827', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            onClick={handleRedo}
          >
            Redo
          </button>

          <button
            type="button"
            style={{ marginLeft: 'auto', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#0d8b93', cursor: 'pointer' }}
            onClick={() => setShowWordCount(prev => !prev)}
          >
            {showWordCount ? 'Hide Word Count' : 'Show Word Count'}
          </button>
          <span style={{ minWidth: 28, textAlign: 'right', fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
            {showWordCount ? wordCount : ''}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          className="input"
          style={{ flex: 1, minHeight: 360, border: 'none', borderRadius: 0, boxShadow: 'none', fontFamily: 'var(--font)', fontSize: 17, lineHeight: 1.7, resize: 'none', padding: '16px 20px' }}
          placeholder="Write your email response here."
          value={value}
          onChange={e => safeOnChange(e.target.value)}
          spellCheck={true}
        />
      </div>
    </div>
  );
}
