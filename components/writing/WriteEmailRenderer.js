'use client';
import { useState } from 'react';

/**
 * Write an Email  Split Layout
 * Left: email prompt / context
 * Right: plain text editor with word count
 *
 * ETS Rubric: 05 (AI scored via OpenAI)
 * Timing: ~10 minutes
 */
export default function WriteEmailRenderer({ prompt = '', context = '', value = '', onChange, questionNumber, totalQuestions }) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="split-layout">
      {/* Left  prompt / context */}
      <div className="split-pane split-pane--left">
        <div className="split-pane__label">Writing Task {questionNumber} of {totalQuestions}</div>

        {/* Simulated email header */}
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <div style={{ background: 'var(--teal)', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>
            Write an Email
          </div>
          <div style={{ padding: '16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {context || 'You have received a message from a friend about a community event. Read the situation and write an appropriate email response.'}
          </div>
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 500 }}>
          {prompt || 'Directions: Read the situation below and write an email in response. Your response should be 75100 words.'}
        </div>

        <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13, color: 'var(--warning)' }}>
           <strong>~10 minutes</strong>  Write a complete, coherent email.
        </div>
      </div>

      {/* Right  editor */}
      <div className="split-pane split-pane--right" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="split-pane__label" style={{ margin: 0 }}>Your Response</div>
          <span style={{ fontSize: 12, color: wordCount >= 75 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
            {wordCount} / 75+ words
          </span>
        </div>

        <textarea
          className="input"
          style={{ flex: 1, minHeight: 380, fontFamily: 'var(--font)', fontSize: 15, lineHeight: 1.7, resize: 'none' }}
          placeholder="Write your email here"
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={true}
        />

      </div>
    </div>
  );
}

