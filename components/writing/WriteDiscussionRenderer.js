'use client';
import { useMemo, useRef, useState } from 'react';

const DEFAULT_THREAD = {
  topic:
    'Volunteerism refers to the act of offering your time and service to a community without financial compensation. Should high school students be required to do volunteer work? Why or why not?',
  sampleA: {
    name: 'Claire',
    message:
      'I think students should complete volunteer hours because it builds responsibility and civic awareness while helping others in meaningful ways.',
  },
  sampleB: {
    name: 'Andrew',
    message:
      'I do not think volunteer hours should be mandatory because some students already have jobs or family responsibilities and may not have enough time.',
  },
};

function parseNameAndMessage(value, fallbackName, fallbackMessage) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { name: fallbackName, message: fallbackMessage, photoUrl: '' };
  }

  const parts = raw.split('||').map(part => part.trim());
  if (parts.length === 1) {
    return { name: fallbackName, message: raw, photoUrl: '' };
  }

  const [namePart, messagePart, photoPart] = parts;
  return {
    name: (namePart || fallbackName).trim() || fallbackName,
    message: (messagePart || fallbackMessage).trim() || fallbackMessage,
    photoUrl: (photoPart || '').trim(),
  };
}

function parsePrompt(prompt) {
  const lines = String(prompt || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const intro = [];
  const bullets = [];

  lines.forEach(line => {
    if (/^[-*•]/.test(line)) {
      bullets.push(line.replace(/^[-*•]\s*/, '').trim());
      return;
    }
    intro.push(line);
  });

  return { intro, bullets };
}

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'S';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

export default function WriteDiscussionRenderer({
  prompt = '',
  options = [],
  speakerPhotoUrl = '',
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

  const parsedPrompt = useMemo(() => parsePrompt(prompt), [prompt]);
  const thread = useMemo(() => {
    const rawOptions = Array.isArray(options) ? options : [];
    const topic = String(rawOptions[0] ?? '').trim() || DEFAULT_THREAD.topic;
    const sampleA = parseNameAndMessage(rawOptions[1], DEFAULT_THREAD.sampleA.name, DEFAULT_THREAD.sampleA.message);
    const sampleB = parseNameAndMessage(rawOptions[2], DEFAULT_THREAD.sampleB.name, DEFAULT_THREAD.sampleB.message);
    const sampleAPhoto = String(rawOptions[3] ?? sampleA.photoUrl ?? '').trim();
    const sampleBPhoto = String(rawOptions[4] ?? sampleB.photoUrl ?? '').trim();
    const professorName = String(rawOptions[5] ?? '').trim() || 'Professor';
    return {
      topic,
      professorName,
      sampleA: { ...sampleA, photoUrl: sampleAPhoto },
      sampleB: { ...sampleB, photoUrl: sampleBPhoto },
    };
  }, [options]);

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
          Time limit: 10 minutes
        </div>
        <div style={{ fontSize: 14, color: '#111', lineHeight: 1.6 }}>
          {parsedPrompt.intro.map((line, index) => (
            <p key={`intro-${index}`} style={{ marginBottom: 8 }}>{line}</p>
          ))}
          {parsedPrompt.bullets.length > 0 && (
            <ul style={{ margin: '0 0 10px 18px' }}>
              {parsedPrompt.bullets.map((bullet, index) => (
                <li key={`bullet-${index}`} style={{ marginBottom: 4 }}>{bullet}</li>
              ))}
            </ul>
          )}
          <p style={{ marginBottom: 12 }}>An effective response will contain at least 100 words.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 12 }}>
          {speakerPhotoUrl ? (
            <img
              src={speakerPhotoUrl}
              alt="Discussion prompt author"
              style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#334155' }}>
              P
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{thread.professorName}</div>
        </div>

        <div style={{ fontSize: 14, color: '#111', lineHeight: 1.6 }}>
          {thread.topic}
        </div>
      </div>

      <div className="split-pane split-pane--right" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', gap: 10, marginBottom: 12 }}>
            {thread.sampleA.photoUrl ? (
              <img
                src={thread.sampleA.photoUrl}
                alt={thread.sampleA.name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                {initials(thread.sampleA.name)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{thread.sampleA.name}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: '#111' }}>{thread.sampleA.message}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', gap: 10 }}>
            {thread.sampleB.photoUrl ? (
              <img
                src={thread.sampleB.photoUrl}
                alt={thread.sampleB.name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#60a5fa', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                {initials(thread.sampleB.name)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{thread.sampleB.name}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: '#111' }}>{thread.sampleB.message}</div>
            </div>
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
          style={{ flex: 1, minHeight: 320, border: 'none', borderRadius: 0, boxShadow: 'none', fontFamily: 'var(--font)', fontSize: 17, lineHeight: 1.7, resize: 'none', padding: '16px 20px' }}
          placeholder="Write your discussion response here."
          value={value}
          onChange={e => safeOnChange(e.target.value)}
          spellCheck={true}
        />
      </div>
    </div>
  );
}
