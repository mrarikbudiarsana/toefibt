'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import QuestionPreview from '@/components/admin/QuestionPreview';

const TASK_TYPES = {
  reading: [
    { value: 'c_test', label: 'C-Test (Inline Blanks)' },
    { value: 'read_daily_life', label: 'Read in Daily Life (Document/Flyer/Email)' },
    { value: 'read_academic', label: 'Read an Academic Passage' },
  ],
  listening: [
    { value: 'listen_choose_response', label: 'Listen and Choose a Response' },
    { value: 'listen_conversation', label: 'Listen to a Conversation' },
    { value: 'listen_announcement', label: 'Listen to an Announcement' },
    { value: 'listen_academic_talk', label: 'Listen to an Academic Talk' },
  ],
  writing: [
    { value: 'build_sentence', label: 'Build a Sentence (Drag & Drop)' },
    { value: 'write_email', label: 'Write an Email' },
    { value: 'write_discussion', label: 'Write for an Academic Discussion' },
  ],
  speaking: [
    { value: 'listen_repeat', label: 'Listen and Repeat' },
    { value: 'take_interview', label: 'Take an Interview' },
  ],
};

const MODULE_OPTIONS = [
  { value: 'module1', label: 'Module 1 (All students)' },
  { value: 'module2_both', label: 'Module 2 - Both Paths (Shared)' },
  { value: 'module2_hard', label: 'Module 2 - Hard Path (Advanced)' },
  { value: 'module2_easy', label: 'Module 2 - Easy Path (Standard)' },
];

const READING_MODULE_GROUPS = [
  {
    value: 'module1',
    title: 'Module 1',
    description: 'Questions every student sees before routing.',
    accent: 'var(--teal)',
    background: 'rgba(15, 118, 110, 0.06)',
  },
  {
    value: 'module2_hard',
    title: 'Hard Path',
    description: 'Advanced follow-up questions after a strong Module 1.',
    accent: '#b45309',
    background: 'rgba(217, 119, 6, 0.08)',
  },
  {
    value: 'module2_easy',
    title: 'Easy Path',
    description: 'Standard follow-up questions after a lower Module 1 score.',
    accent: '#2563eb',
    background: 'rgba(37, 99, 235, 0.08)',
  },
  {
    value: 'module2_both',
    title: 'Both Paths',
    description: 'Shared Module 2 questions shown to both easy and hard routes.',
    accent: '#7c3aed',
    background: 'rgba(124, 58, 237, 0.08)',
  },
];

const LISTENING_MODULE_GROUPS = [
  {
    value: 'module1',
    title: 'Module 1',
    description: 'Questions every student hears before routing.',
    accent: 'var(--teal)',
    background: 'rgba(15, 118, 110, 0.06)',
  },
  {
    value: 'module2_hard',
    title: 'Hard Path',
    description: 'Advanced listening follow-up after a strong Module 1.',
    accent: '#b45309',
    background: 'rgba(217, 119, 6, 0.08)',
  },
  {
    value: 'module2_easy',
    title: 'Easy Path',
    description: 'Standard listening follow-up after a lower Module 1 score.',
    accent: '#2563eb',
    background: 'rgba(37, 99, 235, 0.08)',
  },
  {
    value: 'module2_both',
    title: 'Both Paths',
    description: 'Shared Module 2 listening shown to both easy and hard routes.',
    accent: '#7c3aed',
    background: 'rgba(124, 58, 237, 0.08)',
  },
];

const SECTION_ORDER = ['reading', 'listening', 'writing', 'speaking'];

const READING_DOC_TYPES = [
  { value: 'auto', label: 'Auto Detect (from text)' },
  { value: 'plain', label: 'Generic Document' },
  { value: 'notice', label: 'Notice / Announcement' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social Media Post' },
];

function normalizeReadingPassageEntry(entry) {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return {
      type: entry.type || 'auto',
      text: entry.text || '',
      title: entry.title || '',
      subtitle: entry.subtitle || '',
      to: entry.to || '',
      from: entry.from || '',
      date: entry.date || '',
      subject: entry.subject || '',
      name: entry.name || '',
      handle: entry.handle || '',
      body: entry.body || '',
    };
  }

  return {
    type: 'auto',
    text: typeof entry === 'string' ? entry : String(entry ?? ''),
    title: '',
    subtitle: '',
    to: '',
    from: '',
    date: '',
    subject: '',
    name: '',
    handle: '',
    body: '',
  };
}

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

  return passages.map(normalizeReadingPassageEntry);
}

function serializeReadingPassages(entries) {
  return JSON.stringify((entries || []).map(entry => normalizeReadingPassageEntry(entry)));
}

function emptyQuestion(sectionType) {
  return {
    _id: Math.random().toString(36).slice(2),
    module: 'module1',
    task_type: TASK_TYPES[sectionType]?.[0]?.value ?? '',
    is_scored: true,
    prompt: '',
    options: ['', '', '', ''],
    correct_answer: '',
    audio_url: '',
    speaker_photo_url: '',
    group_audio_url: '',
    group_id: '',
    tiles_data: '',
    order_index: 0,
  };
}

function emptySection(type) {
  return {
    _id: Math.random().toString(36).slice(2),
    section_type: type,
    has_mst: type === 'reading' || type === 'listening',
    module1_threshold: type === 'reading' ? 13 : 11,
    reading_passage: '',
    order_index: SECTION_ORDER.indexOf(type),
    questions: [emptyQuestion(type)],
  };
}

export default function CreateTestPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState(SECTION_ORDER.map(emptySection));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(0);
  const [activeReadingModule, setActiveReadingModule] = useState('module1');
  const [activeListeningModule, setActiveListeningModule] = useState('module1');
  const [collapsedPassages, setCollapsedPassages] = useState({});

  function updateSection(idx, field, value) {
    setSections(prev => prev.map((section, i) => i === idx ? { ...section, [field]: value } : section));
  }

  function updateQuestion(sIdx, qIdx, field, value) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      return {
        ...section,
        questions: section.questions.map((question, j) => j === qIdx ? { ...question, [field]: value } : question),
      };
    }));
  }

  function updateOption(sIdx, qIdx, optIdx, value) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      return {
        ...section,
        questions: section.questions.map((question, j) => {
          if (j !== qIdx) return question;
          const options = [...(question.options ?? ['', '', '', ''])];
          options[optIdx] = value;
          return { ...question, options };
        }),
      };
    }));
  }

  function addQuestion(sIdx, overrides = {}) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      return {
        ...section,
        questions: [...section.questions, { ...emptyQuestion(section.section_type), ...overrides }],
      };
    }));
  }

  function removeQuestion(sIdx, qIdx) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      return { ...section, questions: section.questions.filter((_, j) => j !== qIdx) };
    }));
  }

  function moveQuestion(sIdx, qIdx, direction) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      const nextQuestions = [...section.questions];
      if (direction === -1 && qIdx > 0) {
        [nextQuestions[qIdx - 1], nextQuestions[qIdx]] = [nextQuestions[qIdx], nextQuestions[qIdx - 1]];
      } else if (direction === 1 && qIdx < nextQuestions.length - 1) {
        [nextQuestions[qIdx + 1], nextQuestions[qIdx]] = [nextQuestions[qIdx], nextQuestions[qIdx + 1]];
      }
      return { ...section, questions: nextQuestions };
    }));
  }

  function moveReadingQuestionWithinModule(sIdx, qIdx, direction) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      const currentQuestion = section.questions[qIdx];
      if (!currentQuestion) return section;

      const moduleIndexes = section.questions.reduce((indexes, question, index) => {
        if (question.module === currentQuestion.module) indexes.push(index);
        return indexes;
      }, []);

      const currentPosition = moduleIndexes.indexOf(qIdx);
      const targetIdx = moduleIndexes[currentPosition + direction];
      if (targetIdx === undefined) return section;

      const nextQuestions = [...section.questions];
      [nextQuestions[targetIdx], nextQuestions[qIdx]] = [nextQuestions[qIdx], nextQuestions[targetIdx]];
      return { ...section, questions: nextQuestions };
    }));
  }

  function moveListeningQuestionWithinModule(sIdx, qIdx, direction) {
    setSections(prev => prev.map((section, i) => {
      if (i !== sIdx) return section;
      const currentQuestion = section.questions[qIdx];
      if (!currentQuestion) return section;

      const moduleIndexes = section.questions.reduce((indexes, question, index) => {
        if (question.module === currentQuestion.module) indexes.push(index);
        return indexes;
      }, []);

      const currentPosition = moduleIndexes.indexOf(qIdx);
      const targetIdx = moduleIndexes[currentPosition + direction];
      if (targetIdx === undefined) return section;

      const nextQuestions = [...section.questions];
      [nextQuestions[targetIdx], nextQuestions[qIdx]] = [nextQuestions[qIdx], nextQuestions[targetIdx]];
      return { ...section, questions: nextQuestions };
    }));
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Please enter a test title.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const sb = createClient();

      const { data: test, error: tErr } = await sb
        .from('tests')
        .insert({ title: title.trim(), section_order: SECTION_ORDER })
        .select('id')
        .single();

      if (tErr) throw tErr;

      for (const section of sections) {
        const { data: dbSection, error: sErr } = await sb
          .from('test_sections')
          .insert({
            test_id: test.id,
            section_type: section.section_type,
            has_mst: section.has_mst,
            module1_threshold: section.module1_threshold,
            reading_passage: section.reading_passage,
            order_index: section.order_index,
          })
          .select('id')
          .single();

        if (sErr) throw sErr;

        const questionRows = section.questions.map((question, index) => {
          const rawOptions = Array.isArray(question.options) ? question.options.map(option => String(option ?? '')) : [];
          const options = ['build_sentence', 'write_email', 'write_discussion', 'listen_repeat'].includes(question.task_type)
            ? (rawOptions.some(option => option.trim()) ? rawOptions : null)
            : (() => {
                const filtered = rawOptions.filter(option => option.trim());
                return filtered.length ? filtered : null;
              })();
          const tiles = question.task_type === 'build_sentence' && question.tiles_data.trim()
            ? question.tiles_data.trim().split(',').map(tile => tile.trim())
            : null;

          return {
            section_id: dbSection.id,
            module: question.module,
            task_type: question.task_type,
            is_scored: question.is_scored,
            prompt: question.prompt.trim(),
            options,
            correct_answer: question.correct_answer.trim() || null,
            blanks_data: null,
            audio_url: question.audio_url.trim() || null,
            speaker_photo_url: question.speaker_photo_url.trim() || null,
            group_audio_url: question.group_audio_url.trim() || null,
            group_id: question.group_id.trim() || null,
            tiles_data: tiles,
            order_index: index,
          };
        });

        const { error: qErr } = await sb.from('test_questions').insert(questionRows);
        if (qErr) throw qErr;
      }

      router.push('/admin/tests');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const section = sections[activeSection];
  const readingPassages = section.section_type === 'reading' ? parseReadingPassages(section.reading_passage) : [];
  const readingQuestionEntries = section.section_type === 'reading'
    ? section.questions.map((question, index) => ({ question, index }))
    : [];
  const activeReadingGroup = READING_MODULE_GROUPS.find(group => group.value === activeReadingModule) ?? READING_MODULE_GROUPS[0];
  const activeReadingEntries = readingQuestionEntries.filter(({ question }) => question.module === activeReadingModule);
  const listeningQuestionEntries = section.section_type === 'listening'
    ? section.questions.map((question, index) => ({ question, index }))
    : [];
  const activeListeningGroup = LISTENING_MODULE_GROUPS.find(group => group.value === activeListeningModule) ?? LISTENING_MODULE_GROUPS[0];
  const activeListeningEntries = listeningQuestionEntries.filter(({ question }) => question.module === activeListeningModule);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/tests')}>
          {'<-'} Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>Create New Test</h1>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Test'}
        </button>
      </div>

      {error && <div className="login-form__error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <label className="label" htmlFor="test-title">Test Title</label>
        <input
          id="test-title"
          className="input"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="e.g. TOEFL iBT Mock Test #1 - April 2026"
        />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '2px solid var(--border)' }}>
        {sections.map((item, index) => (
          <button
            key={item._id}
            onClick={() => setActiveSection(index)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeSection === index ? 'var(--surface)' : 'transparent',
              color: activeSection === index ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: activeSection === index ? '3px solid var(--teal)' : '3px solid transparent',
              borderRadius: '6px 6px 0 0',
              marginBottom: '-2px',
            }}
          >
            {item.section_type.charAt(0).toUpperCase() + item.section_type.slice(1)}
            <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 100 }}>
              {item.questions.length}
            </span>
          </button>
        ))}
      </div>

      <div className="card" style={{ borderRadius: '0 0 10px 10px', borderTop: 'none' }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
          {section.has_mst && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label" style={{ marginBottom: 0 }}>MST Module 1 Threshold</span>
              <input
                type="number"
                className="input"
                style={{ width: 100 }}
                value={section.module1_threshold}
                onChange={event => updateSection(activeSection, 'module1_threshold', parseInt(event.target.value, 10))}
                min={1}
                max={35}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Minimum correct answers needed to route students to the hard path.
              </span>
            </label>
          )}

          {section.section_type === 'reading' && (
            <div style={{ flex: 1, minWidth: 320, padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13 }}>
              Reading uses one shared passage bank below. Choose a path tab there, then edit questions in that route.
            </div>
          )}

          {section.section_type === 'listening' && (
            <div style={{ flex: 1, minWidth: 320, padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13 }}>
              Listening questions are grouped by module/path. Switch tabs below to manage each route separately.
            </div>
          )}
        </div>

        {section.section_type === 'reading' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: '#fff', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: activeReadingGroup.accent }}>{activeReadingGroup.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 520 }}>
                    {activeReadingGroup.description}
                  </div>
                </div>
                <div />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {READING_MODULE_GROUPS.map(group => {
                  const count = readingQuestionEntries.filter(({ question }) => question.module === group.value).length;
                  const isActive = group.value === activeReadingModule;
                  return (
                    <button
                      key={group.value}
                      onClick={() => setActiveReadingModule(group.value)}
                      style={{
                        border: `1px solid ${isActive ? group.accent : 'var(--border)'}`,
                        background: isActive ? group.background : '#fff',
                        color: isActive ? group.accent : 'var(--text-secondary)',
                        borderRadius: 999,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 700,
                      }}
                    >
                      <span>{group.title}</span>
                      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 999, background: isActive ? '#fff' : 'var(--bg)', color: 'inherit' }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeReadingEntries.length === 0 ? (
                <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 18, background: 'var(--surface)', fontSize: 14, color: 'var(--text-muted)' }}>
                  No questions in this path yet. Add one to start building this route.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeReadingEntries.map(({ question, index }, groupIndex) => (
                    <QuestionEditor
                      key={question._id}
                      q={question}
                      qIdx={index}
                      displayNumber={groupIndex + 1}
                      sectionType={section.section_type}
                      sec={section}
                      onChange={(field, value) => updateQuestion(activeSection, index, field, value)}
                      onOptionChange={(optIdx, value) => updateOption(activeSection, index, optIdx, value)}
                      onRemove={() => removeQuestion(activeSection, index)}
                      onMoveUp={() => moveReadingQuestionWithinModule(activeSection, index, -1)}
                      onMoveDown={() => moveReadingQuestionWithinModule(activeSection, index, 1)}
                      isFirst={groupIndex === 0}
                      isLast={groupIndex === activeReadingEntries.length - 1}
                    />
                  ))}
                </div>
              )}

              <div style={{ position: 'sticky', bottom: -18, margin: '0 -18px -18px -18px', padding: 18, background: 'linear-gradient(to top, #fff 80%, rgba(255,255,255,0))', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'center' }}>
                <button
                  className="btn btn--outline"
                  style={{ width: '100%', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', background: '#fff' }}
                  onClick={() => addQuestion(activeSection, { module: activeReadingModule })}
                >
                  + Add Question
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: '#f8fafc', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Passage Bank</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Manage the shared reading texts and see how many questions use each one.
                  </div>
                </div>
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => updateSection(activeSection, 'reading_passage', serializeReadingPassages([...readingPassages, { type: 'auto', text: '' }]))}
                >
                  + Add Passage
                </button>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {readingPassages.map((passage, passageIndex) => (
                  (() => {
                    const normalizedPassage = normalizeReadingPassageEntry(passage);
                    const collapseKey = `${activeSection}-${passageIndex}`;
                    const isCollapsed = collapsedPassages[collapseKey] ?? true;
                    const setPassageField = (field, fieldValue) => {
                      const nextPassages = [...readingPassages];
                      nextPassages[passageIndex] = { ...normalizedPassage, [field]: fieldValue };
                      updateSection(activeSection, 'reading_passage', serializeReadingPassages(nextPassages));
                    };

                    return (
                    <div
                      key={passageIndex}
                      style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, background: '#fff' }}
                    >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Passage {passageIndex + 1}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {readingQuestionEntries.filter(({ question }) => question.group_id === String(passageIndex)).length} linked questions
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="btn btn--sm"
                          onClick={() => {
                            setCollapsedPassages(prev => ({ ...prev, [collapseKey]: !isCollapsed }));
                          }}
                        >
                          {isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                        {readingPassages.length > 1 && (
                          <button
                            className="btn btn--sm"
                            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                            onClick={() => {
                              const nextPassages = readingPassages.filter((_, index) => index !== passageIndex);
                              const nextQuestions = section.questions.map(question => {
                                if (!['read_daily_life', 'read_academic'].includes(question.task_type)) return question;
                                const currentIndex = Number.parseInt(question.group_id || '0', 10);
                                if (Number.isNaN(currentIndex) || currentIndex === passageIndex) {
                                  return { ...question, group_id: '0' };
                                }
                                if (currentIndex > passageIndex) {
                                  return { ...question, group_id: String(currentIndex - 1) };
                                }
                                return question;
                              });
                              updateSection(activeSection, 'reading_passage', serializeReadingPassages(nextPassages));
                              updateSection(activeSection, 'questions', nextQuestions);
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    {!isCollapsed && (
                      <>
                    <div style={{ marginBottom: 10 }}>
                      <label className="label" style={{ marginBottom: 6 }}>Document Type</label>
                      <select
                        className="input"
                        value={normalizedPassage.type}
                        onChange={event => setPassageField('type', event.target.value)}
                        style={{ width: '100%', maxWidth: 340 }}
                      >
                        {READING_DOC_TYPES.map(docType => (
                          <option key={docType.value} value={docType.value}>{docType.label}</option>
                        ))}
                      </select>
                    </div>

                    {normalizedPassage.type === 'notice' && (
                      <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                        <input className="input" value={normalizedPassage.title} onChange={event => setPassageField('title', event.target.value)} placeholder="Notice title" />
                        <input className="input" value={normalizedPassage.subtitle} onChange={event => setPassageField('subtitle', event.target.value)} placeholder="Notice subtitle" />
                        <textarea className="input" rows={5} value={normalizedPassage.body} onChange={event => setPassageField('body', event.target.value)} placeholder="Notice body..." />
                      </div>
                    )}

                    {normalizedPassage.type === 'email' && (
                      <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                        <input className="input" value={normalizedPassage.to} onChange={event => setPassageField('to', event.target.value)} placeholder="To" />
                        <input className="input" value={normalizedPassage.from} onChange={event => setPassageField('from', event.target.value)} placeholder="From" />
                        <input className="input" value={normalizedPassage.date} onChange={event => setPassageField('date', event.target.value)} placeholder="Date" />
                        <input className="input" value={normalizedPassage.subject} onChange={event => setPassageField('subject', event.target.value)} placeholder="Subject" />
                        <textarea className="input" rows={5} value={normalizedPassage.body} onChange={event => setPassageField('body', event.target.value)} placeholder="Email body..." />
                      </div>
                    )}

                    {normalizedPassage.type === 'social' && (
                      <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                        <input className="input" value={normalizedPassage.name} onChange={event => setPassageField('name', event.target.value)} placeholder="Display name (e.g. Sofia Baker)" />
                        <input className="input" value={normalizedPassage.handle} onChange={event => setPassageField('handle', event.target.value)} placeholder="Handle (without @)" />
                        <textarea className="input" rows={5} value={normalizedPassage.body} onChange={event => setPassageField('body', event.target.value)} placeholder="Post text..." />
                      </div>
                    )}

                    {(normalizedPassage.type === 'auto' || normalizedPassage.type === 'plain') && (
                    <textarea
                      className="input"
                      rows={5}
                      value={normalizedPassage.text}
                      onChange={event => setPassageField('text', event.target.value)}
                      placeholder={`Passage ${passageIndex + 1} text...`}
                    />
                    )}
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--teal)' }}>
                        Tip: Use <code>==word==</code> to highlight vocabulary words.
                      </p>
                    </div>
                      </>
                    )}
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>
          </div>
        ) : section.section_type === 'listening' ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: '#fff', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: activeListeningGroup.accent }}>{activeListeningGroup.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 520 }}>
                  {activeListeningGroup.description}
                </div>
              </div>
              <div />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {LISTENING_MODULE_GROUPS.map(group => {
                const count = listeningQuestionEntries.filter(({ question }) => question.module === group.value).length;
                const isActive = group.value === activeListeningModule;
                return (
                  <button
                    key={group.value}
                    onClick={() => setActiveListeningModule(group.value)}
                    style={{
                      border: `1px solid ${isActive ? group.accent : 'var(--border)'}`,
                      background: isActive ? group.background : '#fff',
                      color: isActive ? group.accent : 'var(--text-secondary)',
                      borderRadius: 999,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700,
                    }}
                  >
                    <span>{group.title}</span>
                    <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 999, background: isActive ? '#fff' : 'var(--bg)', color: 'inherit' }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeListeningEntries.length === 0 ? (
              <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 18, background: 'var(--surface)', fontSize: 14, color: 'var(--text-muted)' }}>
                No questions in this listening module yet. Add one to start building this route.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activeListeningEntries.map(({ question, index }, groupIndex) => (
                  <QuestionEditor
                    key={question._id}
                    q={question}
                    qIdx={index}
                    displayNumber={groupIndex + 1}
                    sectionType={section.section_type}
                    sec={section}
                    onChange={(field, value) => updateQuestion(activeSection, index, field, value)}
                    onOptionChange={(optIdx, value) => updateOption(activeSection, index, optIdx, value)}
                    onRemove={() => removeQuestion(activeSection, index)}
                    onMoveUp={() => moveListeningQuestionWithinModule(activeSection, index, -1)}
                    onMoveDown={() => moveListeningQuestionWithinModule(activeSection, index, 1)}
                    isFirst={groupIndex === 0}
                    isLast={groupIndex === activeListeningEntries.length - 1}
                  />
                ))}
              </div>
            )}

            <div style={{ position: 'sticky', bottom: -18, margin: '0 -18px -18px -18px', padding: 18, background: 'linear-gradient(to top, #fff 80%, rgba(255,255,255,0))', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn btn--outline"
                style={{ width: '100%', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', background: '#fff' }}
                onClick={() => addQuestion(activeSection, { module: activeListeningModule })}
              >
                + Add Question
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {section.questions.map((question, qIdx) => (
                <QuestionEditor
                  key={question._id}
                  q={question}
                  qIdx={qIdx}
                  displayNumber={qIdx + 1}
                  sectionType={section.section_type}
                  sec={section}
                  onChange={(field, value) => updateQuestion(activeSection, qIdx, field, value)}
                  onOptionChange={(optIdx, value) => updateOption(activeSection, qIdx, optIdx, value)}
                  onRemove={() => removeQuestion(activeSection, qIdx)}
                  onMoveUp={() => moveQuestion(activeSection, qIdx, -1)}
                  onMoveDown={() => moveQuestion(activeSection, qIdx, 1)}
                  isFirst={qIdx === 0}
                  isLast={qIdx === section.questions.length - 1}
                />
              ))}
            </div>

            <div style={{ position: "sticky", bottom: -24, margin: "0 -24px -24px -24px", padding: "16px 24px", background: "linear-gradient(to top, #fff 80%, rgba(255,255,255,0))", borderBottomLeftRadius: 10, borderBottomRightRadius: 10, display: "flex", justifyContent: "center" }}>
              <button
                className="btn btn--outline btn--full"
                style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.05)", background: "#fff" }}
                onClick={() => addQuestion(activeSection)}
              >
                + Add Question
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionEditor({ q, qIdx, displayNumber, sectionType, sec, onChange, onOptionChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [collapsed, setCollapsed] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const taskTypes = TASK_TYPES[sectionType] ?? [];
  const taskTypeLabel = taskTypes.find(taskType => taskType.value === q.task_type)?.label ?? q.task_type ?? 'No task type';
  const showOptions = ['read_daily_life', 'read_academic', 'listen_choose_response', 'listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(q.task_type);
  const showAudio = ['listen_choose_response', 'listen_conversation', 'listen_announcement', 'listen_academic_talk', 'listen_repeat'].includes(q.task_type);
  const showSpeakerPhoto = ['listen_choose_response', 'listen_conversation', 'listen_announcement', 'listen_academic_talk', 'listen_repeat', 'take_interview'].includes(q.task_type);
  const showGroupAudio = ['listen_conversation', 'listen_announcement', 'listen_academic_talk', 'listen_repeat'].includes(q.task_type);
  const showTiles = q.task_type === 'build_sentence';
  const showWriteEmail = q.task_type === 'write_email';
  const showWriteDiscussion = q.task_type === 'write_discussion';
  const showListenRepeatIntro = q.task_type === 'listen_repeat';
  const isGroupIntroTask = ['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(q.task_type);
  const mainAudioLabelByType = {
    listen_conversation: 'Conversation Audio URL (group shared)',
    listen_announcement: 'Announcement Audio URL (group shared)',
    listen_academic_talk: 'Academic Talk Audio URL (group shared)',
  };
  const mainAudioPlaceholderByType = {
    listen_conversation: 'Conversation audio played after directions audio',
    listen_announcement: 'Announcement audio played after directions audio',
    listen_academic_talk: 'Academic talk audio played after directions audio',
  };
  const audioLabel = isGroupIntroTask ? (mainAudioLabelByType[q.task_type] || 'Main Audio URL (group shared)') : 'Audio URL (question audio)';
  const audioPlaceholder = isGroupIntroTask ? (mainAudioPlaceholderByType[q.task_type] || 'Main audio played after directions audio') : 'https://.../audio.mp3';
  const groupAudioLabel = isGroupIntroTask
    ? 'Directions Audio URL (group intro page)'
    : q.task_type === 'listen_repeat'
      ? 'Background Audio URL (group intro page)'
      : 'Group Audio URL (shared passage audio)';
  const groupAudioPlaceholder = isGroupIntroTask
    ? 'Audio played on the special intro page'
    : q.task_type === 'listen_repeat'
      ? 'Audio for speaking context intro shown once before grouped questions'
      : 'Shared audio for all questions in this group';
  const speakerPhotoLabel = q.task_type === 'take_interview'
    ? 'Interviewer Photo URL'
    : q.task_type === 'listen_repeat'
      ? 'Question Image URL'
      : 'Speaker / Interviewer Photo URL';
  const speakerPhotoPlaceholder = q.task_type === 'listen_repeat'
    ? 'https://.../repeat-question-image.jpg'
    : 'https://.../speaker.jpg';
  const readingPassageIndex = Number.parseInt(q.group_id || '0', 10);
  const readingPassages = parseReadingPassages(sec.reading_passage);
  const readingPassageLabel = sectionType === 'reading' && ['read_daily_life', 'read_academic'].includes(q.task_type)
    ? `Passage ${Number.isNaN(readingPassageIndex) ? 1 : readingPassageIndex + 1}`
    : null;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg)', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ minWidth: 44 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>Q{displayNumber ?? (qIdx + 1)}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {taskTypeLabel}
            </span>
            {readingPassageLabel && (
              <span className="badge" style={{ fontSize: 11, background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8' }}>
                {readingPassageLabel}
              </span>
            )}
            <span className={`badge ${q.is_scored ? 'badge--green' : 'badge--warn'}`} style={{ fontSize: 11 }}>
              {q.is_scored ? 'Scored' : 'Unscored'}
            </span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.4, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {q.prompt?.trim() || 'No prompt yet'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={event => event.stopPropagation()}>
          <button
            className="btn btn--sm"
            style={{ padding: '3px 8px', fontSize: 13 }}
            onClick={() => {
              setShowPreview(prev => {
                const next = !prev;
                if (next) setCollapsed(false);
                return next;
              });
            }}
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button
            className="btn btn--sm"
            style={{ padding: '3px 8px', fontSize: 13 }}
            onClick={() => setCollapsed(prev => !prev)}
          >
            {collapsed ? 'Open' : 'Close'}
          </button>
          <button
            className="btn btn--sm"
            style={{ padding: '3px 8px', fontSize: 13, opacity: isFirst ? 0.3 : 1 }}
            disabled={isFirst}
            onClick={onMoveUp}
          >
            Up
          </button>
          <button
            className="btn btn--sm"
            style={{ padding: '3px 8px', fontSize: 13, opacity: isLast ? 0.3 : 1 }}
            disabled={isLast}
            onClick={onMoveDown}
          >
            Down
          </button>
          <button
            className="btn btn--sm"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5', padding: '3px 10px', marginLeft: 4 }}
            onClick={onRemove}
          >
            X
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {showPreview && (
            <QuestionPreview
              question={q}
              sectionType={sectionType}
              section={sec}
              questionNumber={displayNumber ?? (qIdx + 1)}
              totalQuestions={1}
            />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
            <div>
              <label className="label" htmlFor={`module-${q._id}`}>{sectionType === 'reading' ? 'Module / Path' : 'Module'}</label>
              <select id={`module-${q._id}`} className="input" value={q.module} onChange={event => onChange('module', event.target.value)}>
                {MODULE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`type-${q._id}`}>Task Type</label>
              <select id={`type-${q._id}`} className="input" value={q.task_type} onChange={event => onChange('task_type', event.target.value)}>
                {taskTypes.map(taskType => <option key={taskType.value} value={taskType.value}>{taskType.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="label">Scored?</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={q.is_scored}
                  onChange={event => onChange('is_scored', event.target.checked)}
                  style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14 }}>{q.is_scored ? 'Scored' : 'Unscored ghost'}</span>
              </label>
            </div>
          </div>

          {(q.task_type === 'read_daily_life' || q.task_type === 'read_academic') && (
            <div style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              <label className="label" style={{ marginBottom: 8 }}>Select Reading Passage</label>
              <select
                className="input"
                value={q.group_id || '0'}
                onChange={event => onChange('group_id', event.target.value)}
                style={{ width: '100%', maxWidth: 300 }}
              >
                {readingPassages.map((_, index) => <option key={index} value={index.toString()}>Passage {index + 1}</option>)}
              </select>
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                This is the passage the student will read for this question. Edit passages in the reading section panel above.
              </p>
            </div>
          )}

          {q.task_type === 'c_test' && (
            <div>
              <label className="label" htmlFor={`inst-${q._id}`}>Custom Instructions</label>
              <input
                id={`inst-${q._id}`}
                className="input"
                value={(q.options ?? [''])[0] ?? ''}
                onChange={event => {
                  const options = [...(q.options ?? [''])];
                  options[0] = event.target.value;
                  onChange('options', options);
                }}
                placeholder="e.g. Fill in the missing letters in the paragraph."
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor={`prompt-${q._id}`}>
              {q.task_type === 'listen_repeat'
                ? 'Sentence to Repeat'
                : q.task_type === 'c_test'
                  ? 'C-Test Passage Text'
                  : q.task_type === 'write_email'
                    ? 'Write Email Directions'
                    : q.task_type === 'write_discussion'
                      ? 'Discussion Task Directions'
                    : 'Question / Prompt'}
            </label>
            <textarea
              id={`prompt-${q._id}`}
              className="input"
              rows={q.task_type === 'c_test' ? 6 : 3}
              value={q.prompt}
              onChange={event => onChange('prompt', event.target.value)}
              placeholder={
                q.task_type === 'c_test'
                  ? 'Enter passage and use {{brackets}} for blanks. e.g. The quick br{{own}} fox...'
                  : q.task_type === 'write_email'
                    ? 'Write an email to the editor. In your email, include the following: ...'
                    : q.task_type === 'write_discussion'
                      ? 'Write a post responding to the professor. In your response, do the following: ...'
                    : 'Enter question text, passage, or instruction...'
              }
            />
            {q.task_type === 'c_test' && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                <strong>How to create blanks:</strong> Wrap the missing part of the word in double curly brackets.
                For example, typing <code>pas{`{{sage}}`}</code> will display <code>pas____</code> to the student and evaluate
                {' '}<code>sage</code>{' '}as the correct answer.
              </p>
            )}
          </div>

          {showWriteEmail && (
            <div style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="label" htmlFor={`email-to-${q._id}`}>Recipient (To)</label>
                  <input
                    id={`email-to-${q._id}`}
                    className="input"
                    value={(q.options ?? [])[1] ?? ''}
                    onChange={event => {
                      const options = [...(q.options ?? ['', '', '', ''])];
                      options[1] = event.target.value;
                      onChange('options', options);
                    }}
                    placeholder="editor@magazine.com"
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`email-subject-${q._id}`}>Subject</label>
                  <input
                    id={`email-subject-${q._id}`}
                    className="input"
                    value={(q.options ?? [])[2] ?? ''}
                    onChange={event => {
                      const options = [...(q.options ?? ['', '', '', ''])];
                      options[2] = event.target.value;
                      onChange('options', options);
                    }}
                    placeholder="Problem using submission form"
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor={`email-context-${q._id}`}>Scenario / Context</label>
                <textarea
                  id={`email-context-${q._id}`}
                  className="input"
                  rows={4}
                  value={(q.options ?? [])[0] ?? ''}
                  onChange={event => {
                    const options = [...(q.options ?? ['', '', '', ''])];
                    options[0] = event.target.value;
                    onChange('options', options);
                  }}
                  placeholder="Your school's poetry magazine asked for submissions, but you had a problem with the online form..."
                />
              </div>
            </div>
          )}

          {showWriteDiscussion && (
            <div style={{ background: '#f8fafc', border: '1px solid #dbe5ef', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#eaf2f9', borderBottom: '1px solid #dbe5ef', fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#1e3a5f' }}>
                Discussion Thread Setup
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#fff', border: '1px solid #dbe5ef', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#334155', marginBottom: 10 }}>
                    Professor
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label" htmlFor={`discussion-prof-name-${q._id}`}>Professor Name</label>
                      <input
                        id={`discussion-prof-name-${q._id}`}
                        className="input"
                        value={(q.options ?? [])[5] ?? ''}
                        onChange={event => {
                          const options = [...(q.options ?? ['', '', '', '', '', ''])];
                          options[5] = event.target.value;
                          onChange('options', options);
                        }}
                        placeholder="Dr. Achebe"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`discussion-prof-photo-${q._id}`}>Professor Photo URL</label>
                      <input
                        id={`discussion-prof-photo-${q._id}`}
                        className="input"
                        value={q.speaker_photo_url || ''}
                        onChange={event => onChange('speaker_photo_url', event.target.value)}
                        placeholder="https://example.com/professor.jpg"
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div>
                      <label className="label" htmlFor={`discussion-topic-${q._id}`}>Professor Topic / Prompt Text</label>
                      <textarea
                        id={`discussion-topic-${q._id}`}
                        className="input"
                        rows={4}
                        value={(q.options ?? [])[0] ?? ''}
                        onChange={event => {
                          const options = [...(q.options ?? ['', '', '', '', '', ''])];
                          options[0] = event.target.value;
                          onChange('options', options);
                        }}
                        placeholder="Volunteerism refers to the act of offering your time and service..."
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#fff', border: '1px solid #dbe5ef', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#334155', marginBottom: 10 }}>
                      Sample Student A
                    </div>
                    <label className="label" htmlFor={`discussion-sample-a-${q._id}`}>Post (Name||Message)</label>
                    <input
                      id={`discussion-sample-a-${q._id}`}
                      className="input"
                      value={(q.options ?? [])[1] ?? ''}
                      onChange={event => {
                        const options = [...(q.options ?? ['', '', '', '', '', ''])];
                        options[1] = event.target.value;
                        onChange('options', options);
                      }}
                      placeholder="Claire||I think students should complete volunteer hours because..."
                    />
                    <div style={{ marginTop: 10 }}>
                      <label className="label" htmlFor={`discussion-sample-a-photo-${q._id}`}>Photo URL</label>
                      <input
                        id={`discussion-sample-a-photo-${q._id}`}
                        className="input"
                        value={(q.options ?? [])[3] ?? ''}
                        onChange={event => {
                          const options = [...(q.options ?? ['', '', '', '', '', ''])];
                          options[3] = event.target.value;
                          onChange('options', options);
                        }}
                        placeholder="https://example.com/student-a.jpg"
                      />
                    </div>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #dbe5ef', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#334155', marginBottom: 10 }}>
                      Sample Student B
                    </div>
                    <label className="label" htmlFor={`discussion-sample-b-${q._id}`}>Post (Name||Message)</label>
                    <input
                      id={`discussion-sample-b-${q._id}`}
                      className="input"
                      value={(q.options ?? [])[2] ?? ''}
                      onChange={event => {
                        const options = [...(q.options ?? ['', '', '', '', '', ''])];
                        options[2] = event.target.value;
                        onChange('options', options);
                      }}
                      placeholder="Andrew||I do not think volunteer hours should be required because..."
                    />
                    <div style={{ marginTop: 10 }}>
                      <label className="label" htmlFor={`discussion-sample-b-photo-${q._id}`}>Photo URL</label>
                      <input
                        id={`discussion-sample-b-photo-${q._id}`}
                        className="input"
                        value={(q.options ?? [])[4] ?? ''}
                        onChange={event => {
                          const options = [...(q.options ?? ['', '', '', '', '', ''])];
                          options[4] = event.target.value;
                          onChange('options', options);
                        }}
                        placeholder="https://example.com/student-b.jpg"
                      />
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                  Format tip: use <code>Name||Message</code> for each sample student post.
                </p>
              </div>
            </div>
          )}

          {showListenRepeatIntro && (
            <div style={{ background: '#f8fafc', border: '1px solid #dbe5ef', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#eaf2f9', borderBottom: '1px solid #dbe5ef', fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#1e3a5f' }}>
                Listen & Repeat Intro (Shown Once Per Group)
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="label" htmlFor={`repeat-intro-context-${q._id}`}>Background / Context Text</label>
                  <textarea
                    id={`repeat-intro-context-${q._id}`}
                    className="input"
                    rows={3}
                    value={(q.options ?? [])[0] ?? ''}
                    onChange={event => {
                      const options = [...(q.options ?? ['', ''])];
                      options[0] = event.target.value;
                      onChange('options', options);
                    }}
                    placeholder="You are learning how to guide new students through the campus gym..."
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`repeat-intro-image-${q._id}`}>Intro Image URL</label>
                  <input
                    id={`repeat-intro-image-${q._id}`}
                    className="input"
                    value={(q.options ?? [])[1] ?? ''}
                    onChange={event => {
                      const options = [...(q.options ?? ['', ''])];
                      options[1] = event.target.value;
                      onChange('options', options);
                    }}
                    placeholder="https://example.com/speaking-context.jpg"
                  />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Use the same <code>Group ID</code> and <code>Background Audio URL</code> across repeat questions that share one intro page.
                </p>
              </div>
            </div>
          )}

          {showOptions && (
            <div>
              <label className="label">Answer Options (A-D)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['A', 'B', 'C', 'D'].map((letter, index) => (
                  <div key={letter} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', width: 20 }}>{letter}</span>
                    <input
                      className="input"
                      value={(q.options ?? ['', '', '', ''])[index] ?? ''}
                      onChange={event => onOptionChange(index, event.target.value)}
                      placeholder={`Option ${letter}`}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="label" htmlFor={`correct-${q._id}`}>Correct Answer</label>
                <select
                  id={`correct-${q._id}`}
                  className="input"
                  style={{ width: 120 }}
                  value={q.correct_answer}
                  onChange={event => onChange('correct_answer', event.target.value)}
                >
                  <option value="">-</option>
                  {['A', 'B', 'C', 'D'].map(letter => <option key={letter} value={letter}>{letter}</option>)}
                </select>
              </div>
            </div>
          )}

          {showTiles && (
            <div>
              <label className="label" htmlFor={`tiles-${q._id}`}>Word Tiles (comma-separated)</label>
              <input
                id={`tiles-${q._id}`}
                className="input"
                value={q.tiles_data}
                onChange={event => onChange('tiles_data', event.target.value)}
                placeholder="e.g. The, students, are, studying, English"
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Words will be scrambled automatically.
              </p>
            </div>
          )}

          {showAudio && (
            <div>
              <label className="label" htmlFor={`audio-${q._id}`}>{audioLabel}</label>
              <input
                id={`audio-${q._id}`}
                className="input"
                value={q.audio_url}
                onChange={event => onChange('audio_url', event.target.value)}
                placeholder={audioPlaceholder}
              />
              {isGroupIntroTask && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Use this as the shared main audio (second clip) for all questions in the same group.
                </p>
              )}
            </div>
          )}

          {showGroupAudio && (
            <div>
              <label className="label" htmlFor={`gaudio-${q._id}`}>{groupAudioLabel}</label>
              <input
                id={`gaudio-${q._id}`}
                className="input"
                value={q.group_audio_url}
                onChange={event => onChange('group_audio_url', event.target.value)}
                placeholder={groupAudioPlaceholder}
              />
              {isGroupIntroTask && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  This group link is the directions clip played before questions appear.
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <label className="label" htmlFor={`gid-${q._id}`}>Group ID</label>
                <input
                  id={`gid-${q._id}`}
                  className="input"
                  style={{ width: 200 }}
                  value={q.group_id}
                  onChange={event => onChange('group_id', event.target.value)}
                  placeholder="e.g. conv-01"
                />
              </div>
            </div>
          )}

          {showSpeakerPhoto && (
            <div>
              <label className="label" htmlFor={`photo-${q._id}`}>{speakerPhotoLabel}</label>
              <input
                id={`photo-${q._id}`}
                className="input"
                value={q.speaker_photo_url}
                onChange={event => onChange('speaker_photo_url', event.target.value)}
                placeholder={speakerPhotoPlaceholder}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
