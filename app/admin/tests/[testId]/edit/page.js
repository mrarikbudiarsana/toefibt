'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TASK_TYPES = {
  reading: [
    { value: 'c_test', label: 'C-Test (Inline Blanks)' },
    { value: 'read_daily_life', label: 'Read in Daily Life (Phone Mockup)' },
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
    order_index: SECTION_ORDER.indexOf(type),
    questions: [emptyQuestion(type)],
  };
}

export default function EditTestPage() {
  const router = useRouter();
  const { testId } = useParams();
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    async function loadTest() {
      try {
        const sb = createClient();
        const { data, error: err } = await sb
          .from('tests')
          .select(`
            id, title,
            test_sections (
              id, section_type, has_mst, module1_threshold, order_index, reading_passage,
              test_questions (
                id, module, task_type, is_scored, prompt, options, correct_answer, blanks_data, tiles_data,
                audio_url, speaker_photo_url, group_audio_url, group_id, order_index
              )
            )
          `)
          .eq('id', testId)
          .single();

        if (err) throw err;
        
        setTitle(data.title);
        
        let loadedSections = data.test_sections || [];
        loadedSections.sort((a, b) => a.order_index - b.order_index);
        
        const mappedSections = SECTION_ORDER.map((secType, secIndex) => {
          const loadedSec = loadedSections.find(s => s.section_type === secType);
          if (loadedSec) {
            let loadedQuestions = loadedSec.test_questions || [];
            loadedQuestions.sort((a, b) => a.order_index - b.order_index);
            
            return {
              _id: loadedSec.id,
              section_type: loadedSec.section_type,
              has_mst: !!loadedSec.has_mst,
              module1_threshold: loadedSec.module1_threshold ?? (secType === 'reading' ? 13 : 11),
              reading_passage: loadedSec.reading_passage ?? '',
              order_index: loadedSec.order_index,
              questions: loadedQuestions.map(q => {
                const tiles = q.tiles_data ? (typeof q.tiles_data === 'string' ? JSON.parse(q.tiles_data) : q.tiles_data) : [];
                return {
                  _id: q.id,
                  module: q.module || 'module1',
                  task_type: q.task_type || '',
                  is_scored: q.is_scored !== false, // default true
                  prompt: q.prompt || '',
                  options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : ['', '', '', ''],
                  correct_answer: q.correct_answer || '',
                  audio_url: q.audio_url || '',
                  speaker_photo_url: q.speaker_photo_url || '',
                  group_audio_url: q.group_audio_url || '',
                  group_id: q.group_id || '',
                  tiles_data: Array.isArray(tiles) ? tiles.join(', ') : (tiles || ''),
                  order_index: q.order_index || 0,
                };
              }),
            };
          } else {
            return emptySection(secType);
          }
        });
        
        setSections(mappedSections);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (testId) loadTest();
  }, [testId]);

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

  async function handleSave() {
    if (!title.trim()) { setError('Please enter a test title.'); return; }
    setSaving(true);
    setError('');
    try {
      const sb = createClient();

      // Update test title
      const { error: tErr } = await sb
        .from('tests')
        .update({ title: title.trim(), section_order: SECTION_ORDER })
        .eq('id', testId);
      if (tErr) throw tErr;

      // For simplicity when editing complex nested structures, we'll delete existing sections mapped to this test
      // and re-insert them. This avoids complex diffing for updates/deletions.
      const { error: delErr } = await sb.from('test_sections').delete().eq('test_id', testId);
      if (delErr) throw delErr;

      // Insert fresh sections + questions
      for (const sec of sections) {
        const { data: dbSec, error: sErr } = await sb
          .from('test_sections')
          .insert({
            test_id: testId,
            section_type: sec.section_type,
            has_mst: sec.has_mst,
            module1_threshold: sec.module1_threshold,
            reading_passage: sec.reading_passage,
            order_index: sec.order_index,
          })
          .select('id')
          .single();
        if (sErr) throw sErr;

        if (sec.questions.length > 0) {
          const qRows = sec.questions.map((q, idx) => {
            const options = q.options?.filter(o => o.trim());
            const tiles = q.task_type === 'build_sentence' && typeof q.tiles_data === 'string' && q.tiles_data.trim()
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
      }

      router.push('/admin/tests');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading test data...</div>;
  }

  if (!sections.length) return null;

  const sec = sections[activeSection];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/tests')}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, flex: 1 }}>Edit Test</h1>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Changes'}
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
             <div style={{ flex: 1 }}>
               <label className="label" htmlFor="reading-passage">Optional Global Reading Passage</label>
               <textarea
                 id="reading-passage"
                 className="input"
                 rows={4}
                 value={sec.reading_passage || ''}
                 onChange={e => updateSection(activeSection, 'reading_passage', e.target.value)}
                 placeholder="Enter the main passage here if multiple questions use it..."
               />
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
              onChange={(field, value) => updateQuestion(activeSection, qIdx, field, value)}
              onOptionChange={(optIdx, value) => updateOption(activeSection, qIdx, optIdx, value)}
              onRemove={() => removeQuestion(activeSection, qIdx)}
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

function QuestionEditor({ q, qIdx, sectionType, onChange, onOptionChange, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);
  const taskTypes = TASK_TYPES[sectionType] ?? [];
  const showOptions = ['c_test', 'read_daily_life', 'read_academic', 'listen_choose_response',
    'listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(q.task_type);
  const showAudio = ['listen_choose_response', 'listen_conversation', 'listen_announcement',
    'listen_academic_talk', 'listen_repeat'].includes(q.task_type);
  const showSpeakerPhoto = ['listen_conversation', 'listen_announcement', 'listen_academic_talk', 'take_interview'].includes(q.task_type);
  const showGroupAudio = ['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(q.task_type);
  const showTiles = q.task_type === 'build_sentence';

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
        <button
          className="btn btn--sm"
          style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5', padding: '3px 10px' }}
          onClick={e => { e.stopPropagation(); onRemove(); }}
        >✕</button>
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

          {/* Prompt */}
          <div>
            <label className="label" htmlFor={`prompt-${q._id}`}>
              {q.task_type === 'listen_repeat' ? 'Sentence to Repeat' : 'Question / Prompt'}
            </label>
            <textarea
              id={`prompt-${q._id}`}
              className="input"
              rows={3}
              value={q.prompt}
              onChange={e => onChange('prompt', e.target.value)}
              placeholder="Enter question text, passage, or instruction…"
            />
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
