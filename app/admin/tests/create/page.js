'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  { value: 'module2_hard', label: 'Module 2 — Hard Path (Advanced)' },
  { value: 'module2_easy', label: 'Module 2 — Easy Path (Standard)' },
];

const SECTION_ORDER = ['reading', 'listening', 'writing', 'speaking'];

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

  function updateSection(idx, field, value) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function updateQuestion(sIdx, qIdx, field, value) {
    setSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, questions: s.questions.map((q, j) => j === qIdx ? { ...q, [field]: value } : q) };
    }));
  }

  function updateOption(sIdx, qIdx, optIdx, value) {
    setSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return {
        ...s, questions: s.questions.map((q, j) => {
          if (j !== qIdx) return q;
          const opts = [...(q.options ?? ['', '', '', ''])];
          opts[optIdx] = value;
          return { ...q, options: opts };
        })
      };
    }));
  }

  function addQuestion(sIdx) {
    setSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, questions: [...s.questions, emptyQuestion(s.section_type)] };
    }));
  }

  function removeQuestion(sIdx, qIdx) {
    setSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, questions: s.questions.filter((_, j) => j !== qIdx) };
    }));
  }

  function moveQuestion(sIdx, qIdx, direction) {
    setSections(prev => prev.map((s, i) => {
      if (i !== sIdx) return s;
      const newQuestions = [...s.questions];
      if (direction === -1 && qIdx > 0) {
        const temp = newQuestions[qIdx - 1];
        newQuestions[qIdx - 1] = newQuestions[qIdx];
        newQuestions[qIdx] = temp;
      } else if (direction === 1 && qIdx < newQuestions.length - 1) {
        const temp = newQuestions[qIdx + 1];
        newQuestions[qIdx + 1] = newQuestions[qIdx];
        newQuestions[qIdx] = temp;
      }
      return { ...s, questions: newQuestions };
    }));
  }

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a test title.'); return; }
    setSaving(true);
    setError('');
    try {
      const sb = createClient();

      // Insert test
      const { data: test, error: tErr } = await sb
        .from('tests')
        .insert({ title: title.trim(), section_order: SECTION_ORDER })
        .select('id')
        .single();
      if (tErr) throw tErr;

      // Insert sections + questions
      for (const sec of sections) {
        const { data: dbSec, error: sErr } = await sb
          .from('test_sections')
          .insert({
            test_id: test.id,
            section_type: sec.section_type,
            has_mst: sec.has_mst,
            module1_threshold: sec.module1_threshold,
            order_index: sec.order_index,
          })
          .select('id')
          .single();
        if (sErr) throw sErr;

        const qRows = sec.questions.map((q, idx) => {
          const options = q.options?.filter(o => o.trim());
          const tiles = q.task_type === 'build_sentence' && q.tiles_data.trim()
            ? q.tiles_data.trim().split(',').map(t => t.trim())
            : null;
          return {
            section_id: dbSec.id,
            module: q.module,
            task_type: q.task_type,
            is_scored: q.is_scored,
            prompt: q.prompt.trim(),
            options: options?.length ? options : null,
            correct_answer: q.correct_answer.trim() || null,
            blanks_data: null,
            audio_url: q.audio_url.trim() || null,
            speaker_photo_url: q.speaker_photo_url.trim() || null,
            group_audio_url: q.group_audio_url.trim() || null,
            group_id: q.group_id.trim() || null,
            tiles_data: tiles,
            order_index: idx,
          };
        });

        const { error: qErr } = await sb.from('test_questions').insert(qRows);
        if (qErr) throw qErr;
      }

      router.push('/admin/tests');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const sec = sections[activeSection];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/tests')}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>Create New Test</h1>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Test'}
        </button>
      </div>

      {error && (
        <div className="login-form__error" style={{ marginBottom: 20 }}>{error}</div>
      )}

      {/* Test title */}
      <div className="card" style={{ marginBottom: 24 }}>
        <label className="label" htmlFor="test-title">Test Title</label>
        <input
          id="test-title"
          className="input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. TOEFL iBT Mock Test #1 — April 2026"
        />
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '2px solid var(--border)' }}>
        {sections.map((s, i) => (
          <button
            key={s._id}
            onClick={() => setActiveSection(i)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeSection === i ? 'var(--surface)' : 'transparent',
              color: activeSection === i ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: activeSection === i ? '3px solid var(--teal)' : '3px solid transparent',
              borderRadius: '6px 6px 0 0',
              marginBottom: '-2px',
            }}
          >
            {s.section_type.charAt(0).toUpperCase() + s.section_type.slice(1)}
            <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 100 }}>
              {s.questions.length}
            </span>
          </button>
        ))}
      </div>

      {/* Section config */}
      <div className="card" style={{ borderRadius: '0 0 10px 10px', borderTop: 'none' }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-light)' }}>
          {sec.has_mst && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label" style={{ marginBottom: 0 }}>MST Module 1 Threshold</span>
              <input
                type="number"
                className="input"
                style={{ width: 100 }}
                value={sec.module1_threshold}
                onChange={e => updateSection(activeSection, 'module1_threshold', parseInt(e.target.value))}
                min={1} max={35}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Min correct answers to route to Hard path
              </span>
            </label>
          )}
          {sec.section_type === 'reading' && (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
               <label className="label">Reading Passages</label>
               {(() => {
                 let passages = [];
                 try { passages = sec.reading_passage ? JSON.parse(sec.reading_passage) : ['']; }
                 catch(e) { passages = [sec.reading_passage || '']; }
                 if (!Array.isArray(passages)) passages = [passages];
                 
                 return passages.map((p, i) => (
                   <div key={i} style={{ display: 'flex', gap: 8 }}>
                     <textarea
                       className="input"
                       rows={4}
                       value={p}
                       onChange={e => {
                         const newP = [...passages];
                         newP[i] = e.target.value;
                         updateSection(activeSection, 'reading_passage', JSON.stringify(newP));
                       }}
                       placeholder={`Passage ${i + 1} text...`}
                     />
                     {passages.length > 1 && (
                       <button className="btn btn--sm" style={{ alignSelf: 'flex-start', background: 'var(--danger-bg)', color: 'var(--danger)' }} 
                         onClick={() => {
                           const newP = passages.filter((_, idx) => idx !== i);
                           updateSection(activeSection, 'reading_passage', JSON.stringify(newP));
                         }}>✕</button>
                     )}
                   </div>
                 )).concat(
                   <button key="add" className="btn btn--sm btn--outline" style={{ alignSelf: 'flex-start' }}
                     onClick={() => {
                       updateSection(activeSection, 'reading_passage', JSON.stringify([...passages, '']));
                     }}>+ Add Passage</button>
                 );
               })()}
             </div>
          )}
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sec.questions.map((q, qIdx) => (
            <QuestionEditor
              key={q._id}
              q={q}
              qIdx={qIdx}
              sectionType={sec.section_type}
              sec={sec}
              onChange={(field, value) => updateQuestion(activeSection, qIdx, field, value)}
              onOptionChange={(optIdx, value) => updateOption(activeSection, qIdx, optIdx, value)}
              onRemove={() => removeQuestion(activeSection, qIdx)}
              onMoveUp={() => moveQuestion(activeSection, qIdx, -1)}
              onMoveDown={() => moveQuestion(activeSection, qIdx, 1)}
              isFirst={qIdx === 0}
              isLast={qIdx === sec.questions.length - 1}
            />
          ))}
        </div>

        <button
          className="btn btn--outline btn--full"
          style={{ marginTop: 16 }}
          onClick={() => addQuestion(activeSection)}
        >
          + Add Question
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({ q, qIdx, sectionType, sec, onChange, onOptionChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [collapsed, setCollapsed] = useState(false);
  const taskTypes = TASK_TYPES[sectionType] ?? [];
  const showOptions = ['read_daily_life', 'read_academic', 'listen_choose_response',
    'listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(q.task_type);
  const showAudio = ['listen_choose_response', 'listen_conversation', 'listen_announcement',
    'listen_academic_talk', 'listen_repeat'].includes(q.task_type);
  const showSpeakerPhoto = ['listen_conversation', 'listen_announcement', 'listen_academic_talk', 'take_interview'].includes(q.task_type);
  const showGroupAudio = ['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(q.task_type);
  const showTiles = q.task_type === 'build_sentence';
  const showCTestBlanks = q.task_type === 'c_test';

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Question header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg)', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>Q{qIdx + 1}</span>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
          {q.task_type || 'No task type'} · {q.prompt?.slice(0, 60) || 'No prompt'}
        </span>
        <span className={`badge ${q.is_scored ? 'badge--green' : 'badge--warn'}`} style={{ fontSize: 11 }}>
          {q.is_scored ? 'Scored' : 'Unscored'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{collapsed ? '▼' : '▲'}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn--sm"
            style={{ padding: '3px 8px', fontSize: 13, opacity: isFirst ? 0.3 : 1 }}
            disabled={isFirst}
            onClick={onMoveUp}
          >↑</button>
          <button
            className="btn btn--sm"
            style={{ padding: '3px 8px', fontSize: 13, opacity: isLast ? 0.3 : 1 }}
            disabled={isLast}
            onClick={onMoveDown}
          >↓</button>
          <button
            className="btn btn--sm"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5', padding: '3px 10px', marginLeft: 4 }}
            onClick={onRemove}
          >✕</button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: Module + task type + scored */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
            <div>
              <label className="label" htmlFor={`module-${q._id}`}>Module</label>
              <select id={`module-${q._id}`} className="input" value={q.module} onChange={e => onChange('module', e.target.value)}>
                {MODULE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`type-${q._id}`}>Task Type</label>
              <select id={`type-${q._id}`} className="input" value={q.task_type} onChange={e => onChange('task_type', e.target.value)}>
                {taskTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="label">Scored?</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={q.is_scored} onChange={e => onChange('is_scored', e.target.checked)} style={{ accentColor: 'var(--teal)', width: 16, height: 16 }} />
                <span style={{ fontSize: 14 }}>{q.is_scored ? 'Scored' : 'Unscored ghost'}</span>
              </label>
            </div>
          </div>

          {/* Reading Passage Notice & Selection */}
          {(q.task_type === 'read_daily_life' || q.task_type === 'read_academic') && (
            <div style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              <label className="label" style={{ marginBottom: 8 }}>Select Reading Passage</label>
              <select className="input" value={q.group_id || '0'} onChange={e => onChange('group_id', e.target.value)} style={{ width: '100%', maxWidth: 300 }}>
                {(() => {
                   let passages = [];
                   try { passages = sec.reading_passage ? JSON.parse(sec.reading_passage) : ['']; }
                   catch(e) { passages = [sec.reading_passage || '']; }
                   if (!Array.isArray(passages)) passages = [passages];
                   return passages.map((_, i) => <option key={i} value={i.toString()}>Passage {i + 1}</option>);
                })()}
              </select>
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                This is the passage the student will read for this question. You can edit the passages at the top of the Reading Section configuration.
              </p>
            </div>
          )}

          {/* Custom Instruction (C-Test only) */}
          {q.task_type === 'c_test' && (
            <div>
              <label className="label" htmlFor={`inst-${q._id}`}>Custom Instructions</label>
              <input
                id={`inst-${q._id}`}
                className="input"
                value={(q.options ?? [''])[0] ?? ''}
                onChange={e => {
                  const opts = [...(q.options ?? [''])];
                  opts[0] = e.target.value;
                  onChange('options', opts);
                }}
                placeholder="e.g. Fill in the missing letters in the paragraph."
              />
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="label" htmlFor={`prompt-${q._id}`}>
              {q.task_type === 'listen_repeat' ? 'Sentence to Repeat' : 
               q.task_type === 'c_test' ? 'C-Test Passage Text' :
               'Question / Prompt'}
            </label>
            <textarea
              id={`prompt-${q._id}`}
              className="input"
              rows={q.task_type === 'c_test' ? 6 : 3}
              value={q.prompt}
              onChange={e => onChange('prompt', e.target.value)}
              placeholder={q.task_type === 'c_test' ? 'Enter passage and use {{brackets}} for blanks. e.g. The quick br{{own}} fox...' : 'Enter question text, passage, or instruction…'}
            />
            {q.task_type === 'c_test' && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                <strong>How to create blanks:</strong> Wrap the missing part of the word in double curly brackets. 
                For example, typing <code>pas{`{{sage}}`}</code> will display <code>pas____</code> to the student, and evaluate "sage" as the correct answer. Each bracket set represents one scored blank.
              </p>
            )}
          </div>

          {/* MCQ Options */}
          {showOptions && (
            <div>
              <label className="label">Answer Options (A–D)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['A', 'B', 'C', 'D'].map((letter, i) => (
                  <div key={letter} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', width: 20 }}>{letter}</span>
                    <input
                      className="input"
                      value={(q.options ?? ['', '', '', ''])[i] ?? ''}
                      onChange={e => onOptionChange(i, e.target.value)}
                      placeholder={`Option ${letter}`}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="label" htmlFor={`correct-${q._id}`}>Correct Answer</label>
                <select id={`correct-${q._id}`} className="input" style={{ width: 120 }} value={q.correct_answer} onChange={e => onChange('correct_answer', e.target.value)}>
                  <option value="">—</option>
                  {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Tiles (Build a Sentence) */}
          {showTiles && (
            <div>
              <label className="label" htmlFor={`tiles-${q._id}`}>Word Tiles (comma-separated)</label>
              <input
                id={`tiles-${q._id}`}
                className="input"
                value={q.tiles_data}
                onChange={e => onChange('tiles_data', e.target.value)}
                placeholder="e.g. The, students, are, studying, English"
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Words will be scrambled automatically.</p>
            </div>
          )}

          {/* Audio URLs */}
          {showAudio && (
            <div>
              <label className="label" htmlFor={`audio-${q._id}`}>Audio URL (question audio)</label>
              <input id={`audio-${q._id}`} className="input" value={q.audio_url} onChange={e => onChange('audio_url', e.target.value)} placeholder="https://…/audio.mp3" />
            </div>
          )}
          {showGroupAudio && (
            <div>
              <label className="label" htmlFor={`gaudio-${q._id}`}>Group Audio URL (shared passage audio)</label>
              <input id={`gaudio-${q._id}`} className="input" value={q.group_audio_url} onChange={e => onChange('group_audio_url', e.target.value)} placeholder="Shared audio for all questions in this group" />
              <div style={{ marginTop: 8 }}>
                <label className="label" htmlFor={`gid-${q._id}`}>Group ID</label>
                <input id={`gid-${q._id}`} className="input" style={{ width: 200 }} value={q.group_id} onChange={e => onChange('group_id', e.target.value)} placeholder="e.g. conv-01" />
              </div>
            </div>
          )}
          {showSpeakerPhoto && (
            <div>
              <label className="label" htmlFor={`photo-${q._id}`}>Speaker / Interviewer Photo URL</label>
              <input id={`photo-${q._id}`} className="input" value={q.speaker_photo_url} onChange={e => onChange('speaker_photo_url', e.target.value)} placeholder="https://…/speaker.jpg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
