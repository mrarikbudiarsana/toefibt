'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CTestRenderer from '@/components/reading/CTestRenderer';
import ReadDailyLifeRenderer from '@/components/reading/ReadDailyLifeRenderer';
import ReadAcademicRenderer from '@/components/reading/ReadAcademicRenderer';
import BuildSentenceRenderer from '@/components/writing/BuildSentenceRenderer';
import WriteEmailRenderer from '@/components/writing/WriteEmailRenderer';
import WriteDiscussionRenderer from '@/components/writing/WriteDiscussionRenderer';
import ListenRepeatRenderer from '@/components/speaking/ListenRepeatRenderer';
import ListenRepeatIntro from '@/components/speaking/ListenRepeatIntro';
import RadioOptionList from '@/components/shared/RadioOptionList';

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

function AudioMock({ heading, description, choices = [], speakerPhotoUrl = '' }) {
  const [selected, setSelected] = useState(null);

  return (
    <PreviewShell title={heading} subtitle="Preview mode uses a static mock instead of autoplay audio or recording.">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 28px' }}>
        <div style={{ padding: '20px 24px', borderRadius: 12, background: '#fff', border: '1px solid var(--border-light)', marginBottom: 18 }}>
          {speakerPhotoUrl ? (
            <img
              src={speakerPhotoUrl}
              alt="Speaker"
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--teal)', marginBottom: 10 }}
            />
          ) : null}
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Audio / interaction preview</div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>{description}</div>
        </div>
        {choices.length > 0 && (
          <RadioOptionList options={choices.slice(0, 4)} selected={selected} onSelect={setSelected} gap={14} fontSize={15} />
        )}
      </div>
    </PreviewShell>
  );
}

function ListenChooseMock({ choices = [], speakerPhotoUrl = '' }) {
  const [selected, setSelected] = useState(null);
  const cleanChoices = choices
    .slice(0, 4)
    .map(option => String(option).replace(/^[A-D][\.\)\:\-\s]+/i, ''));

  return (
    <PreviewShell title="Listening Preview" subtitle="Listen and Choose displays audio with options only (prompt hidden).">
      <div style={{ width: '100%', maxWidth: 980, margin: '0 auto', padding: '16px 16px 20px' }}>
        <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 14, lineHeight: 1.35 }}>
          Choose the best response.
        </div>

        {speakerPhotoUrl ? (
          <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={speakerPhotoUrl} alt="Speaker" style={{ width: 280, maxWidth: '100%', height: 380, objectFit: 'contain', objectPosition: 'center top' }} />
            </div>

            <div style={{ width: '100%', paddingTop: 10 }}>
              <RadioOptionList options={cleanChoices} selected={selected} onSelect={setSelected} gap={14} fontSize={15} />
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <RadioOptionList options={cleanChoices} selected={selected} onSelect={setSelected} gap={14} fontSize={15} />
          </div>
        )}
      </div>
    </PreviewShell>
  );
}

function ListenConversationMock({ choices = [], speakerPhotoUrl = '', question = '' }) {
  const [selected, setSelected] = useState(null);
  const cleanQuestion = question?.trim() || 'What is the main point of the conversation?';
  const cleanChoices = choices
    .slice(0, 4)
    .map(option => String(option).replace(/^[A-D][\.\)\:\-\s]+/i, ''));

  return (
    <PreviewShell title="Listening Preview" subtitle="Conversation flow preview: audio plays first, then this timed question screen.">
      <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '16px 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {speakerPhotoUrl ? (
              <img
                src={speakerPhotoUrl}
                alt="Conversation speakers"
                style={{ width: 300, maxWidth: '100%', height: 400, objectFit: 'contain', objectPosition: 'center top' }}
              />
            ) : (
              <div style={{ width: 300, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 22 }}>
                Conversation
              </div>
            )}
          </div>

          <div style={{ width: '100%', paddingTop: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 12, lineHeight: 1.45 }}>
              {cleanQuestion}
            </div>
            <RadioOptionList options={cleanChoices} selected={selected} onSelect={setSelected} gap={14} fontSize={15} />
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function ListenRepeatFlowMock({ question = {}, options = [] }) {
  const introText = String(options?.[0] || '').trim();
  const introImageUrl = String(options?.[1] || '').trim();
  const introAudioUrl = String(question.group_audio_url || '').trim();

  const hasIntro = introText || introImageUrl || introAudioUrl;
  const [phase, setPhase] = useState(hasIntro ? 'intro' : 'question');

  if (phase === 'question') {
    return (
      <PreviewShell subtitle="Student-facing speaking preview" flush>
        <div style={{ height: 760, overflow: 'auto', position: 'relative' }}>
          <ListenRepeatRenderer
            audioUrl={question.audio_url}
            speakerPhotoUrl={question.speaker_photo_url}
            prompt={question.prompt}
            onRecordingReady={() => {}}
          />
        </div>
      </PreviewShell>
    );
  }

  return (
    <PreviewShell subtitle="Student-facing intro context preview" flush>
      <div style={{ height: 760, overflow: 'auto', position: 'relative' }}>
        <ListenRepeatIntro
          contextText={introText}
          introImageUrl={introImageUrl}
          introAudioUrl={introAudioUrl}
          onFinished={() => setPhase('question')}
        />
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
  const isConversationFlow =
    ['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(taskType) ||
    (taskType === 'listen_choose_response' && Boolean(String(question.group_audio_url || '').trim()));

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
    return (
      <PreviewShell subtitle="Student-facing writing preview" flush>
        <div style={{ height: 640, overflow: 'hidden' }}>
          <BuildSentenceRenderer
            prompt={question.prompt}
            speaker1PhotoUrl={question.speaker_photo_url}
            speaker2PhotoUrl={question.audio_url}
            options={options}
            answer={tileAnswer}
            onAnswer={setTileAnswer}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            title={options[2]}
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
            options={options}
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
            options={options}
            speakerPhotoUrl={question.speaker_photo_url || ''}
            value={textValue}
            onChange={setTextValue}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
          />
        </div>
      </PreviewShell>
    );
  }

  if (isConversationFlow) {
    return (
      <ListenConversationMock
        choices={options}
        speakerPhotoUrl={question.speaker_photo_url || ''}
        question={question.prompt || ''}
      />
    );
  }

  if (taskType === 'listen_choose_response') {
    return (
      <ListenChooseMock
        choices={options}
        speakerPhotoUrl={question.speaker_photo_url || ''}
        question={question.prompt || ''}
      />
    );
  }

  if (['listen_announcement', 'listen_academic_talk'].includes(taskType)) {
    return (
      <AudioMock
        heading="Listening Preview"
        description={question.prompt || 'Shared-audio listening question preview'}
        choices={options}
      />
    );
  }

  if (taskType === 'listen_repeat') {
    return <ListenRepeatFlowMock question={question} options={options} />;
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

