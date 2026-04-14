'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ToeflNavbar from '@/components/ToeflNavbar';
import MustAnswerModal from '@/components/MustAnswerModal';
import CTestRenderer from '@/components/reading/CTestRenderer';
import ReadDailyLifeRenderer from '@/components/reading/ReadDailyLifeRenderer';
import ReadAcademicRenderer from '@/components/reading/ReadAcademicRenderer';
import ListenChooseRenderer from '@/components/listening/ListenChooseRenderer';
import ListenAudioFirstRenderer from '@/components/listening/ListenAudioFirstRenderer';
import BuildSentenceRenderer from '@/components/writing/BuildSentenceRenderer';
import WriteEmailRenderer from '@/components/writing/WriteEmailRenderer';
import WriteDiscussionRenderer from '@/components/writing/WriteDiscussionRenderer';
import ListenRepeatRenderer from '@/components/speaking/ListenRepeatRenderer';
import TakeInterviewRenderer from '@/components/speaking/TakeInterviewRenderer';
import { getReadingMSTPath, getListeningMSTPath, getModuleQuestions, computeRawScore } from '@/lib/mst';

// ── Section order per ETS Jan 2026 format ──
const SECTION_ORDER = ['reading', 'listening', 'writing', 'speaking'];
const SECTION_LABELS = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

// ── Screen states ──
// intro → module_intro → question → module_end → section_end
const TIMER_DEFAULTS = { reading: 36 * 60, listening: 36 * 60, writing: 29 * 60, speaking: 16 * 60 };

export default function TestPage() {
  const { assignmentId } = useParams();
  const router = useRouter();
  const supabase = createClient();

  // ── Loading ──────────────────────────────────────────────
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Test State ───────────────────────────────────────────
  const [sectionIdx, setSectionIdx] = useState(0);
  const [screen, setScreen] = useState('intro'); // intro | module_intro | question | module_end | section_end | done
  const [currentModule, setCurrentModule] = useState('module1'); // module1 | module2_easy | module2_hard
  const [questions, setQuestions] = useState([]); // questions for current module
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // {questionId: answer}
  const [writingAnswers, setWritingAnswers] = useState({});
  const [speakingBlobs, setSpeakingBlobs] = useState({});
  const [mstPaths, setMstPaths] = useState({}); // {reading: 'hard', listening: 'easy'}
  const [module1Answers, setModule1Answers] = useState({});

  // ── Timer ────────────────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // ── UI ───────────────────────────────────────────────────
  const [mustAnswerModal, setMustAnswerModal] = useState(false);
  const [audioEnded, setAudioEnded] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const section = SECTION_ORDER[sectionIdx];
  const sectionLabel = SECTION_LABELS[section] ?? '';
  const currentQuestion = questions[questionIdx] ?? null;

  // ── Load test data ────────────────────────────────────────
  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error: e } = await supabase
          .from('test_assignments')
          .select(`
            id, available_from, due_at,
            tests (
              id, title, section_order,
              test_sections (
                id, section_type, has_mst, module1_threshold, order_index,
                test_questions (
                  id, module, task_type, is_scored, prompt, options, correct_answer,
                  audio_url, speaker_photo_url, group_audio_url, group_id,
                  blanks_data, tiles_data, order_index
                )
              )
            )
          `)
          .eq('id', assignmentId)
          .single();
        if (e) throw e;
        setTestData(data);
        setTimeRemaining(TIMER_DEFAULTS.reading);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning || timeRemaining == null) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) { clearInterval(timerRef.current); advanceSection(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // ── Helpers ───────────────────────────────────────────────
  function getSectionData(s) {
    const sections = testData?.tests?.test_sections ?? [];
    return sections.find(sec => sec.section_type === s);
  }

  function loadModuleQuestions(s, mod) {
    const sec = getSectionData(s);
    if (!sec) return [];
    return (sec.test_questions ?? [])
      .filter(q => q.module === mod)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  // ── Start a section ────────────────────────────────────────
  function startSection(secName) {
    const qs = loadModuleQuestions(secName, 'module1');
    setQuestions(qs);
    setQuestionIdx(0);
    setCurrentModule('module1');
    setScreen('module_intro');
    setTimeRemaining(TIMER_DEFAULTS[secName] ?? 36 * 60);
    setTimerRunning(false);
  }

  function beginModule() {
    setScreen('question');
    setTimerRunning(true);
  }

  // ── Navigate questions ─────────────────────────────────────
  function goNext() {
    const isListening = section === 'listening';
    const isWritingOrSpeaking = section === 'writing' || section === 'speaking';

    // Must Answer enforcement for Listening
    if (isListening && !answers[currentQuestion?.id] && currentQuestion?.task_type !== 'listen_choose_response') {
      if (!answers[currentQuestion?.id]) {
        setMustAnswerModal(true);
        return;
      }
    }

    if (questionIdx < questions.length - 1) {
      setQuestionIdx(i => i + 1);
    } else {
      // End of module
      handleModuleEnd();
    }
  }

  function goBack() {
    // Only Reading section allows Back
    if (section !== 'reading') return;
    if (questionIdx > 0) setQuestionIdx(i => i - 1);
  }

  // ── Module end logic (MST routing) ─────────────────────────
  function handleModuleEnd() {
    const sec = getSectionData(section);
    const hasMST = sec?.has_mst;

    if (currentModule === 'module1' && hasMST) {
      // Save module 1 answers for scoring
      setModule1Answers(prev => ({ ...prev, [section]: { ...answers } }));

      // Determine MST path
      let path;
      const threshold = sec.module1_threshold ?? (section === 'reading' ? 13 : undefined);
      if (section === 'reading') {
        path = getReadingMSTPath(questions, answers, threshold);
      } else {
        path = getListeningMSTPath(questions, answers);
      }

      setMstPaths(prev => ({ ...prev, [section]: path }));
      setScreen('module_end');
    } else {
      setScreen('section_end');
    }
  }

  function startModule2() {
    const path = mstPaths[section];
    const mod = path === 'hard' ? 'module2_hard' : 'module2_easy';
    const qs = loadModuleQuestions(section, mod);
    setQuestions(qs);
    setQuestionIdx(0);
    setCurrentModule(mod);
    setScreen('module_intro');
  }

  function advanceSection() {
    setTimerRunning(false);
    clearInterval(timerRef.current);
    if (sectionIdx < SECTION_ORDER.length - 1) {
      const nextIdx = sectionIdx + 1;
      setSectionIdx(nextIdx);
      startSection(SECTION_ORDER[nextIdx]);
    } else {
      setScreen('done');
      handleSubmit();
    }
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload speaking blobs to storage
      const speakingUrls = {};
      for (const [qId, blob] of Object.entries(speakingBlobs)) {
        const path = `speaking/${assignmentId}/${qId}.webm`;
        await supabase.storage.from('recordings').upload(path, blob, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(path);
        speakingUrls[qId] = publicUrl;
      }

      const payload = {
        assignment_id: assignmentId,
        student_id: user.id,
        answers_json: answers,
        writing_responses: writingAnswers,
        speaking_recording_urls: speakingUrls,
        mst_path: mstPaths,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      const { error: e } = await supabase.from('test_submissions').insert(payload);
      if (e) throw e;

      router.push(`/test/${assignmentId}/results`);
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
    }
  }

  // ── Computed navbar props ──────────────────────────────────
  const isReadingSection = section === 'reading';
  const isListeningSection = section === 'listening';
  const isQuestionScreen = screen === 'question';
  const showVolume = screen !== 'module_end' && screen !== 'section_end' && screen !== 'done';
  const showBack = isReadingSection && isQuestionScreen;
  const showSubbar = screen !== 'intro';

  const counterText = (() => {
    if (!isQuestionScreen) return '';
    const q = currentQuestion;
    const taskType = q?.task_type;
    if (taskType === 'c_test') {
      const start = questionIdx + 1;
      const end = Math.min(questionIdx + 10, questions.length);
      const scored = questions.filter(q => q.is_scored !== false).length;
      return `Questions ${start}–${end} of ${scored}`;
    }
    const num = questionIdx + 1;
    const total = questions.filter(q => q.is_scored !== false).length;
    return `Question ${num} of ${total}`;
  })();

  // ── Render question ────────────────────────────────────────
  function renderQuestion() {
    if (!currentQuestion) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No questions found for this module.</div>;

    const { task_type, prompt, options: rawOptions, audio_url, speaker_photo_url, group_audio_url, group_id, blanks_data, tiles_data } = currentQuestion;
    const qId = currentQuestion.id;
    const options = rawOptions ? (typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions) : [];
    const selected = answers[qId] ?? null;
    const onSelect = (letter) => setAnswers(prev => ({ ...prev, [qId]: letter }));

    // Reading
    if (task_type === 'c_test') {
      const blanks = blanks_data ? (typeof blanks_data === 'string' ? JSON.parse(blanks_data) : blanks_data) : [];
      return (
        <CTestRenderer
          passage={prompt}
          blanks={blanks}
          answers={answers}
          onAnswer={(blankId, val) => setAnswers(prev => ({ ...prev, [blankId]: val }))}
          questionRange={[questionIdx + 1, Math.min(questionIdx + 10, questions.length)]}
          totalScored={questions.filter(q => q.is_scored !== false).length}
        />
      );
    }
    if (task_type === 'read_daily_life') {
      const sec = getSectionData(section);
      return <ReadDailyLifeRenderer passage={sec?.reading_passage} question={prompt} options={options} selected={selected} onSelect={onSelect} questionNumber={questionIdx + 1} totalQuestions={questions.length} />;
    }
    if (task_type === 'read_academic') {
      const sec = getSectionData(section);
      return <ReadAcademicRenderer passage={sec?.reading_passage} question={prompt} options={options} selected={selected} onSelect={onSelect} questionNumber={questionIdx + 1} totalQuestions={questions.length} />;
    }

    // Listening
    if (task_type === 'listen_choose_response') {
      const key = qId;
      return (
        <ListenChooseRenderer
          audioUrl={audio_url}
          options={options}
          selected={selected}
          onSelect={onSelect}
          audioEnded={!!audioEnded[key]}
          onAudioEnd={() => setAudioEnded(prev => ({ ...prev, [key]: true }))}
        />
      );
    }
    if (['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(task_type)) {
      return (
        <ListenAudioFirstRenderer
          audioUrl={group_audio_url ?? audio_url}
          speakerPhotoUrl={speaker_photo_url}
          taskType={task_type}
          question={prompt}
          options={options}
          selected={selected}
          onSelect={onSelect}
          questionNumber={questionIdx + 1}
        />
      );
    }

    // Writing
    if (task_type === 'build_sentence') {
      const tiles = tiles_data ? (typeof tiles_data === 'string' ? JSON.parse(tiles_data) : tiles_data) : [];
      return (
        <BuildSentenceRenderer
          tiles={tiles}
          answer={writingAnswers[qId] ?? []}
          onAnswer={ordered => setWritingAnswers(prev => ({ ...prev, [qId]: ordered }))}
          questionNumber={questionIdx + 1}
          totalQuestions={questions.length}
        />
      );
    }
    if (task_type === 'write_email') {
      return (
        <WriteEmailRenderer
          prompt={prompt}
          value={writingAnswers[qId] ?? ''}
          onChange={val => setWritingAnswers(prev => ({ ...prev, [qId]: val }))}
          questionNumber={questionIdx + 1}
          totalQuestions={questions.length}
        />
      );
    }
    if (task_type === 'write_discussion') {
      return (
        <WriteDiscussionRenderer
          prompt={prompt}
          value={writingAnswers[qId] ?? ''}
          onChange={val => setWritingAnswers(prev => ({ ...prev, [qId]: val }))}
          questionNumber={questionIdx + 1}
          totalQuestions={questions.length}
        />
      );
    }

    // Speaking
    if (task_type === 'listen_repeat') {
      return (
        <ListenRepeatRenderer
          audioUrl={audio_url}
          prompt={prompt}
          onRecordingReady={blob => setSpeakingBlobs(prev => ({ ...prev, [qId]: blob }))}
        />
      );
    }
    if (task_type === 'take_interview') {
      return (
        <TakeInterviewRenderer
          question={prompt}
          interviewerPhotoUrl={speaker_photo_url}
          onRecordingReady={blob => setSpeakingBlobs(prev => ({ ...prev, [qId]: blob }))}
          questionNumber={questionIdx + 1}
          totalQuestions={questions.length}
        />
      );
    }

    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Unknown task type: {task_type}</div>;
  }

  // ── Early returns ──────────────────────────────────────────
  if (loading) return <FullScreenMessage>Loading your test…</FullScreenMessage>;
  if (error) return <FullScreenMessage error>{error}</FullScreenMessage>;

  if (!testData?.tests) return <FullScreenMessage>Test not found.</FullScreenMessage>;

  // ── INTRO SCREEN ───────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <ToeflNavbar sectionName="" showSubbar={false} showVolume={false} />
        <div className="card" style={{ maxWidth: 560, textAlign: 'center', padding: '48px 40px', marginTop: 60 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{testData.tests.title ?? 'TOEFL iBT Mock Test'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            This test has 4 sections: Reading, Listening, Writing, and Speaking.<br />
            Total time: approximately <strong>117 minutes</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
            {[
              { label: '📖 Reading', time: '~36 min', info: 'Adaptive — 2 modules' },
              { label: '🎧 Listening', time: '~36 min', info: 'Adaptive — 2 modules' },
              { label: '✍️ Writing', time: '~29 min', info: 'Email + Discussion' },
              { label: '🗣️ Speaking', time: '~16 min', info: 'Repeat + Interview' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.info} · {s.time}</span>
              </div>
            ))}
          </div>
          <button className="btn btn--primary btn--lg btn--full" onClick={() => { setSectionIdx(0); startSection('reading'); }}>
            Begin Test →
          </button>
        </div>
      </div>
    );
  }

  // ── MODULE INTRO SCREEN ────────────────────────────────────
  if (screen === 'module_intro') {
    const moduleLabel = currentModule === 'module1' ? 'Module 1' : (mstPaths[section] === 'hard' ? 'Module 2 (Advanced)' : 'Module 2 (Standard)');
    const isListening = section === 'listening';
    return (
      <div className="test-layout--no-subbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <ToeflNavbar sectionName={sectionLabel} showSubbar={false} showVolume={false} />
        <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '48px 40px', marginTop: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)', marginBottom: 12 }}>
            {sectionLabel} Section · {moduleLabel}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Section Directions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.75, marginBottom: 24 }}>
            {section === 'reading' && 'This section measures your ability to understand written academic English. Read each passage and answer the questions.'}
            {section === 'listening' && <>
              This section measures your ability to understand spoken English.<br /><br />
              <strong>IMPORTANT:</strong> You will <u>NOT</u> be able to return to previous questions. You must answer each question before moving on.
            </>}
            {section === 'writing' && 'This section measures your ability to write in English. Complete each writing task using the editor provided.'}
            {section === 'speaking' && 'This section measures your ability to speak in English. Listen carefully and record your responses when prompted.'}
          </p>
          <button className="btn btn--primary btn--lg btn--full" onClick={beginModule}>
            {isListening ? 'Begin Listening →' : 'Begin →'}
          </button>
        </div>
      </div>
    );
  }

  // ── MODULE END (MST transition) ────────────────────────────
  if (screen === 'module_end') {
    return (
      <div className="test-layout--no-subbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <ToeflNavbar sectionName={sectionLabel} showSubbar={false} showVolume={false} />
        <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '48px 40px', marginTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Module 1 Complete</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            You have completed Module 1 of the {sectionLabel} section. The second module will now begin. The question counter will reset.
          </p>
          <button className="btn btn--primary btn--lg btn--full" onClick={startModule2}>
            Continue to Module 2 →
          </button>
        </div>
      </div>
    );
  }

  // ── SECTION END ────────────────────────────────────────────
  if (screen === 'section_end') {
    const isLast = sectionIdx === SECTION_ORDER.length - 1;
    return (
      <div className="test-layout--no-subbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <ToeflNavbar sectionName={sectionLabel} showSubbar={false} showVolume={false} />
        <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '48px 40px', marginTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{isLast ? '🎉' : '✅'}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
            {isLast ? 'Test Complete!' : `${sectionLabel} Section Complete`}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            {isLast
              ? 'You have completed all sections of the TOEFL iBT mock test. Your responses are being submitted.'
              : `You have completed the ${sectionLabel} section. Click Continue to begin the next section.`}
          </p>
          <button
            className="btn btn--primary btn--lg btn--full"
            onClick={advanceSection}
            disabled={submitting}
          >
            {isLast ? (submitting ? 'Submitting…' : 'View Results →') : `Continue to ${SECTION_LABELS[SECTION_ORDER[sectionIdx + 1]]} →`}
          </button>
        </div>
      </div>
    );
  }

  // ── QUESTION SCREEN ────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh' }}>
      <ToeflNavbar
        sectionName={sectionLabel}
        counter={counterText}
        timeRemaining={timeRemaining}
        showVolume={showVolume}
        showSubbar={showSubbar}
        showBack={showBack}
        showNext={true}
        onBack={goBack}
        onNext={goNext}
        nextLabel={questionIdx >= questions.length - 1 ? 'Next Section' : 'Next'}
        nextDisabled={false}
        subbarInfo={`${sectionLabel} — ${currentModule === 'module1' ? 'Module 1' : (mstPaths[section] === 'hard' ? 'Module 2 Advanced' : 'Module 2 Standard')}`}
      />

      {/* Must Answer modal */}
      {mustAnswerModal && (
        <MustAnswerModal onReturn={() => setMustAnswerModal(false)} />
      )}

      {/* Question content */}
      <div className="test-layout">
        {renderQuestion()}
      </div>
    </div>
  );
}

function FullScreenMessage({ children, error }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: error ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 16, textAlign: 'center' }}>
        {children}
      </div>
    </div>
  );
}
