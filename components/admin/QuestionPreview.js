'use client';

import { useMemo, useState } from 'react';
import CTestRenderer from '@/components/reading/CTestRenderer';
import ReadDailyLifeRenderer from '@/components/reading/ReadDailyLifeRenderer';
import ReadAcademicRenderer from '@/components/reading/ReadAcademicRenderer';
import BuildSentenceRenderer from '@/components/writing/BuildSentenceRenderer';
import WriteEmailRenderer from '@/components/writing/WriteEmailRenderer';
import WriteDiscussionRenderer from '@/components/writing/WriteDiscussionRenderer';

function parseReadingPassages(value) {
  let passages = [];
  try {
    passages = value ? JSON.parse(value) : [''];
  } catch {
    passages = [value || ''];
  }

  if (!Array.isArray(passages) || passages.length === 0) {
    passages = [''];
  }

  return passages;
}

function toPassageText(passage) {
  if (typeof passage === 'string') return passage;
  if (!passage || typeof passage !== 'object') return String(passage ?? '');

  if (passage.type === 'email') {
    const headers = [
      passage.to ? `To: ${passage.to}` : '',
      passage.from ? `From: ${passage.from}` : '',
      passage.date ? `Date: ${passage.date}` : '',
      passage.subject ? `Subject: ${passage.subject}` : '',
    ].filter(Boolean);
    return [...headers, '', passage.body || passage.text || ''].join('\n').trim();
  }

  if (passage.type === 'notice') {
    return [passage.title || '', passage.subtitle || '', passage.body || passage.text || '']
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (passage.type === 'social') {
    return [passage.name || '', passage.body || passage.text || ''].filter(Boolean).join('\n').trim();
  }

  return passage.text || passage.body || '';
}

function parseJsonLike(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function PreviewShell({ title = 'Question Preview', subtitle, children, flush = false }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', background: '#fff' }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal)' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</div>
        )}
      </div>
      <div style={{ padding: flush ? 0 : 8 }}>
        {children}
      </div>
    </div>
  );
}

function AudioMock({ heading, description, choices = [] }) {
  return (
    <PreviewShell title={heading} subtitle="Preview mode uses a static mock instead of autoplay audio or recording.">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 28px' }}>
        <div style={{ padding: '20px 24px', borderRadius: 12, background: '#fff', border: '1px solid var(--border-light)', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Audio / interaction preview</div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>{description}</div>
        </div>
        {choices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {choices.slice(0, 4).map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              return (
                <div
                  key={letter}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', background: '#fff' }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontWeight: 700 }}>
                    {letter}
                  </span>
                  <span>{opt}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PreviewShell>
  );
}

export default function QuestionPreview({ question, sectionType, section, questionNumber = 1, totalQuestions = 1 }) {
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [textValue, setTextValue] = useState('');
  const [tileAnswer, setTileAnswer] = useState([]);

  const options = useMemo(() => {
    const raw = parseJsonLike(question.options, []);
    return Array.isArray(raw) ? raw : [];
  }, [question.options]);

  const taskType = question.task_type;

  if (taskType === 'c_test') {
    return (
      <PreviewShell subtitle="Student-facing reading preview">
        <CTestRenderer
          qId={question._id || question.id || 'preview'}
          passage={question.prompt || ''}
          instruction={options[0] || 'Fill in the missing letters in the paragraph.'}
          answers={answers}
          onAnswer={(blankId, value) => setAnswers(prev => ({ ...prev, [blankId]: value }))}
          questionRange={[questionNumber, questionNumber + 9]}
          totalScored={Math.max(totalQuestions, 1)}
        />
      </PreviewShell>
    );
  }

  if (taskType === 'read_daily_life' || taskType === 'read_academic') {
    const passages = parseReadingPassages(section?.reading_passage);
    const passageIndex = Number.parseInt(question.group_id || '0', 10);
    const passageEntry = passages[passageIndex] || passages[0] || '';

    return (
      <PreviewShell subtitle="Student-facing reading preview" flush>
        <div style={{ height: 760, overflow: 'hidden' }}>
          {taskType === 'read_daily_life' ? (
            <ReadDailyLifeRenderer
              passage={passageEntry}
              question={question.prompt}
              options={options}
              selected={selected}
              onSelect={setSelected}
              questionNumber={questionNumber}
              totalQuestions={totalQuestions}
            />
          ) : (
            <ReadAcademicRenderer
              passage={toPassageText(passageEntry)}
              question={question.prompt}
              options={options}
              selected={selected}
              onSelect={setSelected}
              questionNumber={questionNumber}
              totalQuestions={totalQuestions}
            />
          )}
        </div>
      </PreviewShell>
    );
  }

  if (taskType === 'build_sentence') {
    const tiles = parseJsonLike(question.tiles_data, []);
    return (
      <PreviewShell subtitle="Student-facing writing preview" flush>
        <div style={{ height: 640, overflow: 'hidden' }}>
          <BuildSentenceRenderer
            tiles={Array.isArray(tiles) ? tiles : []}
            answer={tileAnswer}
            onAnswer={setTileAnswer}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
          />
        </div>
      </PreviewShell>
    );
  }

  if (taskType === 'write_email') {
    return (
      <PreviewShell subtitle="Student-facing writing preview" flush>
        <div style={{ height: 760, overflow: 'hidden' }}>
          <WriteEmailRenderer
            prompt={question.prompt || ''}
            value={textValue}
            onChange={setTextValue}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
          />
        </div>
      </PreviewShell>
    );
  }

  if (taskType === 'write_discussion') {
    return (
      <PreviewShell subtitle="Student-facing writing preview" flush>
        <div style={{ height: 760, overflow: 'hidden' }}>
          <WriteDiscussionRenderer
            prompt={question.prompt || ''}
            value={textValue}
            onChange={setTextValue}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
          />
        </div>
      </PreviewShell>
    );
  }

  if (taskType === 'listen_choose_response') {
    return (
      <AudioMock
        heading="Listening Preview"
        description="In the actual test, audio plays first and the answer choices appear only after the clip ends."
        choices={options}
      />
    );
  }

  if (['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(taskType)) {
    return (
      <AudioMock
        heading="Listening Preview"
        description={question.prompt || 'Shared-audio listening question preview'}
        choices={options}
      />
    );
  }

  if (taskType === 'listen_repeat') {
    return (
      <AudioMock
        heading="Speaking Preview"
        description={`Prompt: ${question.prompt || 'Student hears a sentence, then records a repetition.'}`}
      />
    );
  }

  if (taskType === 'take_interview') {
    return (
      <AudioMock
        heading="Speaking Preview"
        description={`Interview question: ${question.prompt || 'Student reads the interviewer prompt, prepares, then records an answer.'}`}
      />
    );
  }

  return (
    <PreviewShell subtitle="No preview available for this task type yet.">
      <div style={{ padding: 20, color: 'var(--text-muted)' }}>Unknown task type: {taskType}</div>
    </PreviewShell>
  );
}
