'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ToeflNavbar from '@/components/ToeflNavbar';
import MustAnswerModal from '@/components/MustAnswerModal';
import CTestRenderer from '@/components/reading/CTestRenderer';
import ReadDailyLifeRenderer from '@/components/reading/ReadDailyLifeRenderer';
import ReadAcademicRenderer from '@/components/reading/ReadAcademicRenderer';
import ListenChooseRenderer from '@/components/listening/ListenChooseRenderer';
import ListenConversationQuestionRenderer from '@/components/listening/ListenConversationQuestionRenderer';
import ListenGroupAudioIntro from '@/components/listening/ListenGroupAudioIntro';
import ListenRepeatIntro from '@/components/speaking/ListenRepeatIntro';
import BuildSentenceRenderer from '@/components/writing/BuildSentenceRenderer';
import WriteEmailRenderer from '@/components/writing/WriteEmailRenderer';
import WriteDiscussionRenderer from '@/components/writing/WriteDiscussionRenderer';
import ListenRepeatRenderer from '@/components/speaking/ListenRepeatRenderer';
import TakeInterviewRenderer from '@/components/speaking/TakeInterviewRenderer';
import TakeInterviewIntro from '@/components/speaking/TakeInterviewIntro';
import { getReadingMSTPath, getListeningMSTPath, getModuleQuestions, computeRawScore } from '@/lib/mst';
import { getReadingBand, getListeningBand, getCEFR } from '@/lib/scoring';

//  Section order per ETS Jan 2026 format 
const SECTION_ORDER = ['reading', 'listening', 'writing', 'speaking'];
const SECTION_LABELS = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

//  Screen states 
// intro   module_intro   question   module_end   section_end
const TIMER_DEFAULTS = { reading: 36 * 60, listening: 36 * 60, writing: 29 * 60, speaking: 16 * 60 };
const WRITING_TASK_SECONDS = {
  build_sentence: 8 * 60,
  write_email: 7 * 60,
  write_discussion: 10 * 60,
  academic_discussion: 10 * 60,
};

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

export default function TestPage() {
  const { assignmentId } = useParams();
  const router = useRouter();
  const supabase = createClient();

  //  Loading 
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  //  Test State 
  const [sectionIdx, setSectionIdx] = useState(0);
  const [screen, setScreen] = useState('intro'); // intro | module_intro | listening_audio_intro | speaking_repeat_intro | question | module_end | section_end | done
  const [currentModule, setCurrentModule] = useState('module1'); // module1 | module2_easy | module2_hard
  const [questions, setQuestions] = useState([]); // questions for current module
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // {questionId: answer}
  const [writingAnswers, setWritingAnswers] = useState({});
  const [speakingBlobs, setSpeakingBlobs] = useState({});
  const [mstPaths, setMstPaths] = useState({}); // {reading: 'hard', listening: 'easy'}
  const [module1Answers, setModule1Answers] = useState({});
  const answersRef = useRef({});
  const writingAnswersRef = useRef({});
  const speakingBlobsRef = useRef({});
  const mstPathsRef = useRef({});

  //  Timer 
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  //  UI 
  const [mustAnswerModal, setMustAnswerModal] = useState(false);
  const [audioEnded, setAudioEnded] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [volume, setVolume] = useState(1);
  const [listenChooseCountdown, setListenChooseCountdown] = useState(null);
  const listenChooseTimerRef = useRef(null);
  const [playedConversationGroups, setPlayedConversationGroups] = useState({});
  const [pendingConversationAudio, setPendingConversationAudio] = useState(null);
  const [playedRepeatIntroGroups, setPlayedRepeatIntroGroups] = useState({});
  const [pendingRepeatIntro, setPendingRepeatIntro] = useState(null);
  const [playedInterviewIntroGroups, setPlayedInterviewIntroGroups] = useState({});
  const [pendingInterviewIntro, setPendingInterviewIntro] = useState(null);
  const [writingCountdown, setWritingCountdown] = useState(null);
  const writingTimerRef = useRef(null);

  const section = SECTION_ORDER[sectionIdx];
  const sectionLabel = SECTION_LABELS[section] ?? '';
  const currentQuestion = questions[questionIdx] ?? null;
  const currentQuestionId = currentQuestion?.id ?? null;
  const currentTaskType = currentQuestion?.task_type ?? null;
  const currentGroupId = currentQuestion?.group_id ?? '';
  const currentGroupAudioUrl = currentQuestion?.group_audio_url ?? '';
  const currentAudioUrl = currentQuestion?.audio_url ?? '';
  const currentSpeakerPhotoUrl = currentQuestion?.speaker_photo_url ?? '';
  const currentListenChooseAudioEnded = currentQuestionId ? Boolean(audioEnded[currentQuestionId]) : false;
  const questionsGroupSignature = questions
    .map(question => `${question.id}:${question.task_type || ''}:${question.group_id || ''}:${question.group_audio_url || ''}:${question.audio_url || ''}`)
    .join('|');
  const playedGroupSignature = Object.keys(playedConversationGroups).sort().join('|');
  const playedRepeatIntroSignature = Object.keys(playedRepeatIntroGroups).sort().join('|');
  const playedInterviewIntroSignature = Object.keys(playedInterviewIntroGroups).sort().join('|');
  const [writingTaskTimerKey, setWritingTaskTimerKey] = useState(null);
  const draftStorageKey = assignmentId ? `toefl-test-draft:${assignmentId}` : null;

  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;

    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft);
      if (draft.answers && typeof draft.answers === 'object') {
        answersRef.current = draft.answers;
        setAnswers(draft.answers);
      }
      if (draft.writingAnswers && typeof draft.writingAnswers === 'object') {
        writingAnswersRef.current = draft.writingAnswers;
        setWritingAnswers(draft.writingAnswers);
      }
      if (draft.mstPaths && typeof draft.mstPaths === 'object') {
        mstPathsRef.current = draft.mstPaths;
        setMstPaths(draft.mstPaths);
      }
    } catch (err) {
      console.warn('Unable to restore local test draft:', err);
    }
  }, [draftStorageKey]);

  function persistDraft(next = {}) {
    if (!draftStorageKey || typeof window === 'undefined') return;

    const draft = {
      answers: next.answers ?? answersRef.current,
      writingAnswers: next.writingAnswers ?? writingAnswersRef.current,
      mstPaths: next.mstPaths ?? mstPathsRef.current,
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch (err) {
      console.warn('Unable to save local test draft:', err);
    }
  }

  function clearDraft() {
    if (!draftStorageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch (err) {
      console.warn('Unable to clear local test draft:', err);
    }
  }

  function saveAnswerValue(answerKey, value) {
    const nextAnswers = { ...answersRef.current, [answerKey]: value };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    persistDraft({ answers: nextAnswers });
  }

  function saveWritingValue(questionId, value) {
    const nextWritingAnswers = { ...writingAnswersRef.current, [questionId]: value };
    writingAnswersRef.current = nextWritingAnswers;
    setWritingAnswers(nextWritingAnswers);
    persistDraft({ writingAnswers: nextWritingAnswers });
  }

  function saveSpeakingBlob(questionId, blob) {
    const nextSpeakingBlobs = { ...speakingBlobsRef.current, [questionId]: blob };
    speakingBlobsRef.current = nextSpeakingBlobs;
    setSpeakingBlobs(nextSpeakingBlobs);
  }

  function saveMstPath(sectionName, path) {
    const nextMstPaths = { ...mstPathsRef.current, [sectionName]: path };
    mstPathsRef.current = nextMstPaths;
    setMstPaths(nextMstPaths);
    persistDraft({ mstPaths: nextMstPaths });
  }

  // Keep all media elements synced with navbar volume state.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const mediaElements = document.querySelectorAll('audio,video');
    mediaElements.forEach(element => {
      element.muted = false;
      element.defaultMuted = false;
      element.volume = Math.max(0, Math.min(1, volume));
    });
  }, [volume, section, screen, questionIdx]);

  function clearListenChooseTimer() {
    if (listenChooseTimerRef.current) {
      clearInterval(listenChooseTimerRef.current);
      listenChooseTimerRef.current = null;
    }
  }

  function clearWritingTimer() {
    if (writingTimerRef.current) {
      clearInterval(writingTimerRef.current);
      writingTimerRef.current = null;
    }
  }

  function getConversationGroupKey(question) {
    if (!isConversationFlowQuestion(question)) return null;
    const groupToken = question.group_id || question.group_audio_url || question.audio_url || question.id;
    return `${currentModule}:${groupToken}`;
  }

  function getQuestionOptions(question) {
    if (!question?.options) return [];
    if (Array.isArray(question.options)) return question.options;
    try {
      const parsed = JSON.parse(question.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getRepeatGroupKey(question) {
    if (!question || question.task_type !== 'listen_repeat') return null;
    const groupToken = question.group_id || question.group_audio_url || question.id;
    return `${currentModule}:${groupToken}`;
  }

  function getListenRepeatIntroConfig(question) {
    const options = getQuestionOptions(question);
    return {
      contextText: String(options?.[0] || '').trim(),
      introImageUrl: String(options?.[1] || '').trim(),
      introAudioUrl: String(question?.group_audio_url || '').trim(),
    };
  }

  function getInterviewGroupKey(question) {
    if (!question || question.task_type !== 'take_interview') return null;
    const groupToken = question.group_id || question.group_audio_url || question.id;
    return `${currentModule}:${groupToken}`;
  }

  function getTakeInterviewIntroConfig(question) {
    const options = getQuestionOptions(question);
    return {
      contextText: String(options?.[0] || '').trim(),
      introImageUrl: String(options?.[1] || '').trim(),
      introAudioUrl: String(question?.group_audio_url || '').trim(),
    };
  }

  function isConversationFlowQuestion(question) {
    if (!question) return false;
    if (['listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(question.task_type)) return true;
    // Backward-compatible fallback: some conversation items were stored as listen_choose_response
    return question.task_type === 'listen_choose_response' && Boolean(String(question.group_audio_url || '').trim());
  }

  function getWritingTaskKey(question) {
    if (!question || section !== 'writing') return null;
    if (question.task_type === 'build_sentence') return `${currentModule}:build_sentence`;
    if (WRITING_TASK_SECONDS[question.task_type]) return `${currentModule}:${question.id}`;
    return null;
  }

  function advanceWritingTaskTimed(expiredTaskType) {
    if (expiredTaskType === 'build_sentence') {
      const nextIndex = questions.findIndex((question, index) => (
        index > questionIdx && question.task_type !== 'build_sentence'
      ));

      if (nextIndex >= 0) {
        setQuestionIdx(nextIndex);
      } else {
        handleModuleEnd();
      }
      return;
    }

    goNextTimed();
  }

  useEffect(() => {
    clearListenChooseTimer();

    const isTimedListeningQuestion =
      screen === 'question' &&
      section === 'listening' &&
      ['listen_choose_response', 'listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(currentTaskType);

    if (!isTimedListeningQuestion) {
      setListenChooseCountdown(null);
      return;
    }

    const isPlainListenChoose =
      currentTaskType === 'listen_choose_response' &&
      !isConversationFlowQuestion(currentQuestion);
    const listenChooseAudioEnded = isPlainListenChoose
      ? currentListenChooseAudioEnded
      : true;

    // For Listen and Choose, start countdown only after the prompt audio finishes.
    if (!listenChooseAudioEnded) {
      setListenChooseCountdown(null);
      return;
    }

    const secondsByTask = {
      listen_choose_response: 15,
      listen_conversation: 20,
      listen_announcement: 20,
      listen_academic_talk: 25,
    };
    const seconds = secondsByTask[currentTaskType] ?? 15;
    setListenChooseCountdown(seconds);
    listenChooseTimerRef.current = setInterval(() => {
      setListenChooseCountdown(prev => {
        if (prev == null) return null;
        if (prev <= 1) {
          clearListenChooseTimer();
          setTimeout(() => {
            goNextTimed();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearListenChooseTimer();
  }, [screen, section, currentQuestionId, currentTaskType, currentGroupAudioUrl, currentListenChooseAudioEnded]);

  useEffect(() => {
    const isWritingSection = screen === 'question' && section === 'writing';
    if (!isWritingSection) {
      clearWritingTimer();
      setWritingCountdown(null);
      setWritingTaskTimerKey(null);
      return;
    }

    const taskKey = getWritingTaskKey(currentQuestion);
    const seconds = WRITING_TASK_SECONDS[currentTaskType];
    if (!taskKey || !seconds) {
      clearWritingTimer();
      setWritingCountdown(null);
      setWritingTaskTimerKey(null);
      return;
    }

    if (writingTaskTimerKey === taskKey && writingTimerRef.current) {
      return;
    }

    clearWritingTimer();
    setWritingCountdown(seconds);
    setWritingTaskTimerKey(taskKey);

    writingTimerRef.current = setInterval(() => {
      setWritingCountdown(prev => {
        if (prev == null) return null;
        if (prev <= 1) {
          const expiredTaskType = currentTaskType;
          clearWritingTimer();
          setTimeout(() => {
            advanceWritingTaskTimed(expiredTaskType);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {};
  }, [screen, section, currentQuestionId, currentTaskType, currentModule, writingTaskTimerKey]);

  useEffect(() => {
    const isListeningQuestionScreen =
      screen === 'question' &&
      section === 'listening' &&
      isConversationFlowQuestion(currentQuestion);

    if (!isListeningQuestionScreen) return;

    const groupKey = getConversationGroupKey(currentQuestion);
    if (!groupKey || playedConversationGroups[groupKey]) return;

    const firstQuestionIndex = questions.findIndex(question => getConversationGroupKey(question) === groupKey);
    if (firstQuestionIndex !== questionIdx) return;

    setPendingConversationAudio({
      groupKey,
      directionsAudioUrl: currentGroupAudioUrl,
      contentAudioUrl: currentAudioUrl,
      speakerPhotoUrl: currentSpeakerPhotoUrl,
    });
    setScreen('listening_audio_intro');
  }, [
    screen,
    section,
    questionIdx,
    questionsGroupSignature,
    currentQuestionId,
    currentTaskType,
    currentGroupId,
    currentGroupAudioUrl,
    currentAudioUrl,
    currentSpeakerPhotoUrl,
    currentModule,
    playedGroupSignature,
  ]);

  useEffect(() => {
    const isSpeakingRepeatQuestionScreen =
      screen === 'question' &&
      section === 'speaking' &&
      currentTaskType === 'listen_repeat';

    if (!isSpeakingRepeatQuestionScreen) return;

    const groupKey = getRepeatGroupKey(currentQuestion);
    if (!groupKey || playedRepeatIntroGroups[groupKey]) return;

    const firstQuestionIndex = questions.findIndex(question => getRepeatGroupKey(question) === groupKey);
    if (firstQuestionIndex !== questionIdx) return;

    const { contextText, introImageUrl, introAudioUrl } = getListenRepeatIntroConfig(currentQuestion);
    if (!contextText && !introImageUrl && !introAudioUrl) {
      setPlayedRepeatIntroGroups(prev => ({ ...prev, [groupKey]: true }));
      return;
    }

    setPendingRepeatIntro({
      groupKey,
      contextText,
      introImageUrl,
      introAudioUrl,
    });
    setScreen('speaking_repeat_intro');
  }, [
    screen,
    section,
    questionIdx,
    questionsGroupSignature,
    currentQuestionId,
    currentTaskType,
    currentModule,
    playedRepeatIntroSignature,
  ]);

  useEffect(() => {
    const isSpeakingInterviewQuestionScreen =
      screen === 'question' &&
      section === 'speaking' &&
      currentTaskType === 'take_interview';

    if (!isSpeakingInterviewQuestionScreen) return;

    const groupKey = getInterviewGroupKey(currentQuestion);
    if (!groupKey || playedInterviewIntroGroups[groupKey]) return;

    const firstQuestionIndex = questions.findIndex(question => getInterviewGroupKey(question) === groupKey);
    if (firstQuestionIndex !== questionIdx) return;

    const { contextText, introImageUrl, introAudioUrl } = getTakeInterviewIntroConfig(currentQuestion);
    if (!contextText && !introImageUrl && !introAudioUrl) {
      setPlayedInterviewIntroGroups(prev => ({ ...prev, [groupKey]: true }));
      return;
    }

    setPendingInterviewIntro({
      groupKey,
      contextText,
      introImageUrl,
      introAudioUrl,
    });
    setScreen('speaking_interview_intro');
  }, [
    screen,
    section,
    questionIdx,
    questionsGroupSignature,
    currentQuestionId,
    currentTaskType,
    currentModule,
    playedInterviewIntroSignature,
  ]);

  //  Load test data 
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
                reading_passage,
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

  //  Timer 
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

  //  Helpers 
  function getSectionData(s) {
    const sections = testData?.tests?.test_sections ?? [];
    return sections.find(sec => sec.section_type === s);
  }

  function loadModuleQuestions(s, mod) {
    const sec = getSectionData(s);
    if (!sec) return [];
    return (sec.test_questions ?? [])
      .filter(q => {
        if (q.module === mod) return true;
        if (mod === 'module2_easy' || mod === 'module2_hard') {
          return q.module === 'module2_both';
        }
        return false;
      })
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  //  Start a section 
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

  //  Navigate questions 
  function goNext() {
    clearListenChooseTimer();
    const isListening = section === 'listening';

    // Must Answer enforcement for Listening
    if (isListening && !answersRef.current[currentQuestion?.id]) {
      if (!answersRef.current[currentQuestion?.id]) {
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

  function goNextTimed() {
    clearListenChooseTimer();
    if (questionIdx < questions.length - 1) {
      setQuestionIdx(i => i + 1);
    } else {
      handleModuleEnd();
    }
  }

  function goBack() {
    // Only Reading section allows Back
    if (section !== 'reading') return;
    if (questionIdx > 0) setQuestionIdx(i => i - 1);
  }

  //  Module end logic (MST routing) 
  function handleModuleEnd() {
    const sec = getSectionData(section);
    const hasMST = sec?.has_mst;

    if (currentModule === 'module1' && hasMST) {
      // Save module 1 answers for scoring
      setModule1Answers(prev => ({ ...prev, [section]: { ...answersRef.current } }));

      // Determine MST path
      let path;
      const threshold = sec.module1_threshold ?? (section === 'reading' ? 13 : undefined);
      if (section === 'reading') {
        path = getReadingMSTPath(questions, answersRef.current, threshold);
      } else {
        path = getListeningMSTPath(questions, answersRef.current);
      }

      saveMstPath(section, path);
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

  function finishConversationAudioIntro() {
    const groupKey = pendingConversationAudio?.groupKey;
    if (groupKey) {
      setPlayedConversationGroups(prev => ({ ...prev, [groupKey]: true }));
    }
    setPendingConversationAudio(null);
    setScreen('question');
  }

  function finishRepeatIntro() {
    const groupKey = pendingRepeatIntro?.groupKey;
    if (groupKey) {
      setPlayedRepeatIntroGroups(prev => ({ ...prev, [groupKey]: true }));
    }
    setPendingRepeatIntro(null);
    setScreen('question');
  }

  function finishInterviewIntro() {
    const groupKey = pendingInterviewIntro?.groupKey;
    if (groupKey) {
      setPlayedInterviewIntroGroups(prev => ({ ...prev, [groupKey]: true }));
    }
    setPendingInterviewIntro(null);
    setScreen('question');
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

  function getScoredSectionQuestions(secName) {
    const sec = getSectionData(secName);
    const sectionQuestions = sec?.test_questions ?? [];
    if (!sec?.has_mst) {
      return [...sectionQuestions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }

    const module2 = mstPathsRef.current[secName] === 'hard' ? 'module2_hard' : 'module2_easy';
    return [
      ...getModuleQuestions(sectionQuestions, 'module1'),
      ...getModuleQuestions(sectionQuestions, module2),
    ];
  }

  function getImmediateReadingListeningScores() {
    const readingRaw = computeRawScore(getScoredSectionQuestions('reading'), answersRef.current);
    const listeningRaw = computeRawScore(getScoredSectionQuestions('listening'), answersRef.current);
    const readingBand = getReadingBand(readingRaw.raw);
    const listeningBand = getListeningBand(listeningRaw.raw, listeningRaw.total);

    return {
      raw_scores: {
        reading: readingRaw,
        listening: listeningRaw,
      },
      band_scores: {
        reading: readingBand,
        listening: listeningBand,
      },
      cefr_levels: {
        reading: getCEFR(readingBand),
        listening: getCEFR(listeningBand),
      },
    };
  }

  //  Submit 
  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmissionError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('You are not signed in. Please sign in again, then retry submission.');

      const finalAnswers = { ...answersRef.current };
      const finalWritingAnswers = { ...writingAnswersRef.current };
      const finalSpeakingBlobs = { ...speakingBlobsRef.current };
      const finalMstPaths = { ...mstPathsRef.current };

      // Upload speaking blobs to storage
      const speakingUrls = {};
      for (const [qId, blob] of Object.entries(finalSpeakingBlobs)) {
        const path = `speaking/${assignmentId}/${qId}.webm`;
        const { error: uploadError } = await supabase.storage.from('recordings').upload(path, blob, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(path);
        speakingUrls[qId] = publicUrl;
      }

      const immediateScores = getImmediateReadingListeningScores();

      const payload = {
        assignment_id: assignmentId,
        student_id: user.id,
        answers_json: finalAnswers,
        writing_responses: finalWritingAnswers,
        speaking_recording_urls: speakingUrls,
        raw_scores: immediateScores.raw_scores,
        band_scores: immediateScores.band_scores,
        cefr_levels: immediateScores.cefr_levels,
        mst_path: finalMstPaths,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      const { data: existingSubmission, error: lookupError } = await supabase
        .from('test_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const saveQuery = existingSubmission?.id
        ? supabase.from('test_submissions').update(payload).eq('id', existingSubmission.id)
        : supabase.from('test_submissions').insert(payload);

      const { error: saveError } = await saveQuery;
      if (saveError) throw saveError;

      const savedSubmissionId = existingSubmission?.id;
      const verificationQuery = supabase
        .from('test_submissions')
        .select('id, answers_json, writing_responses, speaking_recording_urls, mst_path, status')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: savedSubmission, error: verificationError } = await verificationQuery;
      if (verificationError) throw verificationError;
      if (!savedSubmission?.id || (savedSubmissionId && savedSubmission.id !== savedSubmissionId)) {
        throw new Error('Submission could not be verified. Please retry.');
      }

      const savedAnswers = savedSubmission.answers_json ?? {};
      const savedWriting = savedSubmission.writing_responses ?? {};
      const savedSpeaking = savedSubmission.speaking_recording_urls ?? {};
      const savedMst = savedSubmission.mst_path ?? {};
      const missingAnswerKey = Object.keys(finalAnswers).find(key => savedAnswers[key] !== finalAnswers[key]);
      const missingWritingKey = Object.keys(finalWritingAnswers).find(key => JSON.stringify(savedWriting[key]) !== JSON.stringify(finalWritingAnswers[key]));
      const missingSpeakingKey = Object.keys(speakingUrls).find(key => savedSpeaking[key] !== speakingUrls[key]);
      const missingMstKey = Object.keys(finalMstPaths).find(key => savedMst[key] !== finalMstPaths[key]);

      if (savedSubmission.status !== 'submitted' || missingAnswerKey || missingWritingKey || missingSpeakingKey || missingMstKey) {
        throw new Error('Submission verification failed. Please retry so all answers are saved.');
      }

      clearDraft();
      router.push(`/test/${assignmentId}/results`);
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmissionError(err?.message || 'Your test could not be submitted. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  //  Computed navbar props 
  const isReadingSection = section === 'reading';
  const isListeningSection = section === 'listening';
  const isAdaptive = isReadingSection || isListeningSection;
  const isQuestionScreen = screen === 'question';
  const showVolume = screen !== 'module_end' && screen !== 'section_end' && screen !== 'done';
  const showBack = isReadingSection && isQuestionScreen;
  const showSubbar = screen !== 'intro';
  const questionCountdown = (
    section === 'listening' &&
    isQuestionScreen &&
    ['listen_choose_response', 'listen_conversation', 'listen_announcement', 'listen_academic_talk'].includes(currentQuestion?.task_type)
  ) ? listenChooseCountdown : (
    section === 'writing' &&
    isQuestionScreen &&
    WRITING_TASK_SECONDS[currentQuestion?.task_type]
  ) ? writingCountdown : null;

  const counterText = (() => {
    if (!isQuestionScreen) return '';
    const q = currentQuestion;
    if (!q) return '';

    // Calculate total questions (weighted: c_test=10, others=1)
    const totalQuestions = questions.reduce((sum, item) => {
      return sum + (item.task_type === 'c_test' ? 10 : 1);
    }, 0);

    // Calculate current question number range
    let currentStart = 1;
    for (let i = 0; i < questionIdx; i++) {
      currentStart += (questions[i].task_type === 'c_test' ? 10 : 1);
    }

    if (q.task_type === 'c_test') {
      const currentEnd = currentStart + 9;
      return `Questions ${currentStart}-${currentEnd} of ${totalQuestions}`;
    }

    return `Question ${currentStart} of ${totalQuestions}`;
  })();

  //  Render question 
  function renderQuestion() {
    if (!currentQuestion) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No questions found for this module.</div>;

    const { task_type, prompt, options: rawOptions, audio_url, speaker_photo_url, group_audio_url, group_id, blanks_data, tiles_data } = currentQuestion;
    const qId = currentQuestion.id;
    const options = rawOptions ? (typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions) : [];
    const selected = answers[qId] ?? null;
    const onSelect = (letter) => saveAnswerValue(qId, letter);

    // Weighted calculations
    const totalQuestions = questions.reduce((sum, item) => sum + (item.task_type === 'c_test' ? 10 : 1), 0);
    let currentStart = 1;
    for (let i = 0; i < questionIdx; i++) {
      currentStart += (questions[i].task_type === 'c_test' ? 10 : 1);
    }
    const questionNumber = currentStart;

    // Reading
    if (task_type === 'c_test') {
      const customInstruction = (options && options.length > 0 && options[0]) ? options[0] : 'Fill in the missing letters in the paragraph.';
      return (
        <CTestRenderer
          qId={qId}
          passage={prompt}
          instruction={customInstruction}
          answers={answers}
          onAnswer={saveAnswerValue}
          questionRange={[questionNumber, questionNumber + 9]}
          totalQuestions={totalQuestions}
        />
      );
    }
    if (task_type === 'read_daily_life' || task_type === 'read_academic') {
      const sec = getSectionData(section);
      let passages = [];
      const rawPassage = sec?.reading_passage;
      if (rawPassage) {
        if (typeof rawPassage === 'string') {
          try {
            const parsed = JSON.parse(rawPassage);
            passages = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            passages = [rawPassage];
          }
        } else if (Array.isArray(rawPassage)) {
          passages = rawPassage;
        } else {
          passages = [String(rawPassage)];
        }
      }
      
      const passageIdx = parseInt(group_id || '0', 10);
      const passageEntry = passages[passageIdx] || passages[0] || '';

      if (task_type === 'read_daily_life') {
        return <ReadDailyLifeRenderer passage={passageEntry} question={prompt} options={options} selected={selected} onSelect={onSelect} questionNumber={questionNumber} totalQuestions={totalQuestions} />;
      }
      return <ReadAcademicRenderer passage={toPassageText(passageEntry)} question={prompt} options={options} selected={selected} onSelect={onSelect} questionNumber={questionNumber} totalQuestions={totalQuestions} />;
    }

    // Listening
    if (isConversationFlowQuestion(currentQuestion)) {
      return (
        <ListenConversationQuestionRenderer
          speakerPhotoUrl={speaker_photo_url}
          question={prompt}
          options={options}
          selected={selected}
          onSelect={onSelect}
        />
      );
    }
    if (task_type === 'listen_choose_response') {
      const key = qId;
      return (
        <ListenChooseRenderer
          audioUrl={audio_url}
          speakerPhotoUrl={speaker_photo_url}
          options={options}
          selected={selected}
          onSelect={onSelect}
          audioEnded={!!audioEnded[key]}
          onAudioEnd={() => setAudioEnded(prev => ({ ...prev, [key]: true }))}
        />
      );
    }
    // Writing
    if (task_type === 'build_sentence') {
      const tiles = tiles_data ? (typeof tiles_data === 'string' ? JSON.parse(tiles_data) : tiles_data) : [];
      return (
        <BuildSentenceRenderer
          prompt={prompt}
          speaker1PhotoUrl={speaker_photo_url}
          speaker2PhotoUrl={audio_url}
          options={options}
          tiles={tiles}
          answer={writingAnswers[qId] ?? []}
          onAnswer={ordered => saveWritingValue(qId, ordered)}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      );
    }
    if (task_type === 'write_email') {
      return (
        <WriteEmailRenderer
          prompt={prompt}
          options={options}
          value={writingAnswers[qId] ?? ''}
          onChange={val => saveWritingValue(qId, val)}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      );
    }
    if (task_type === 'write_discussion' || task_type === 'academic_discussion') {
      return (
        <WriteDiscussionRenderer
          prompt={prompt}
          options={options}
          speakerPhotoUrl={speaker_photo_url}
          value={writingAnswers[qId] ?? ''}
          onChange={val => saveWritingValue(qId, val)}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      );
    }

    // Speaking
    if (task_type === 'listen_repeat') {
      return (
        <ListenRepeatRenderer
          audioUrl={audio_url}
          speakerPhotoUrl={speaker_photo_url}
          prompt={prompt}
          onRecordingReady={blob => saveSpeakingBlob(qId, blob)}
          onAutoAdvance={goNextTimed}
        />
      );
    }
    if (task_type === 'take_interview') {
      return (
        <TakeInterviewRenderer
          question={prompt}
          audioUrl={audio_url}
          interviewerPhotoUrl={speaker_photo_url}
          prepSeconds={0}
          autoAdvanceDelaySeconds={5}
          onRecordingReady={blob => saveSpeakingBlob(qId, blob)}
          onAutoAdvance={goNextTimed}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      );
    }

    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Unknown task type: {task_type}</div>;
  }

  //  Early returns 
  if (loading) return <FullScreenMessage>Loading your test</FullScreenMessage>;
  if (error) return <FullScreenMessage error>{error}</FullScreenMessage>;

  if (!testData?.tests) return <FullScreenMessage>Test not found.</FullScreenMessage>;

  //  INTRO SCREEN (Start Page)
  if (screen === 'intro') {
    return (
      <div className="premium-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
        <ToeflNavbar sectionName="" showSubbar={false} showVolume={false} />
        <div className="glass-card" style={{ maxWidth: 640, width: '100%', textAlign: 'center', padding: '32px 40px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--teal)', marginBottom: 8 }}>
            Secure Examination Platform
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, color: 'var(--deep-navy)', letterSpacing: '-0.02em' }}>
            {testData.tests.title ?? 'TOEFL iBT Mock Test'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24, maxWidth: 480, marginInline: 'auto' }}>
            This comprehensive evaluation measures your proficiency across all four linguistic domains.
            Total duration: approximately <strong>117 minutes</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32, textAlign: 'left' }}>
            {[
              { label: 'Reading', time: '36 min', info: 'Adaptive', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
              { label: 'Listening', time: '36 min', info: 'Adaptive', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> },
              { label: 'Writing', time: '29 min', info: '2 Tasks', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
              { label: 'Speaking', time: '16 min', info: '2 Tasks', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.5)', borderRadius: 12, border: '1px solid rgba(13, 115, 119, 0.1)' }}>
                <div style={{ color: 'var(--teal)', display: 'flex' }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--deep-navy)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.info} &middot; {s.time}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-premium" style={{ width: '100%', fontSize: 16 }} onClick={() => { setSectionIdx(0); startSection('reading'); }}>
            Begin Examination
          </button>
        </div>
      </div>
    );
  }

  //  SECTION DIRECTIONS SCREEN
  if (screen === 'module_intro') {
    const moduleLabel = isAdaptive ? (currentModule === 'module1' ? 'Module 1' : 'Module 2') : '';
    const isListening = section === 'listening';

    const sectionIcon = {
      reading: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
      listening: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
      writing: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
      speaking: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    }[section];

    return (
      <div className="premium-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
        <ToeflNavbar sectionName={sectionLabel} showSubbar={false} showVolume={false} />
        <div className="glass-card" style={{ maxWidth: 560, width: '100%', textAlign: 'center', padding: '24px 32px' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--teal)' }}>
            {sectionIcon}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--teal)', marginBottom: 4 }}>
            {sectionLabel} Section {moduleLabel && <>&middot; <span style={{ fontSize: 18 }}>{moduleLabel}</span></>}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: 'var(--deep-navy)' }}>Section Directions</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.75, marginBottom: 24, textAlign: 'left', background: 'rgba(0,0,0,0.03)', padding: '16px 20px', borderRadius: 12 }}>
            {section === 'reading' && 'This section measures your ability to understand written academic English. Read each passage and answer the questions.'}
            {section === 'listening' && (
              <>
                This section measures your ability to understand spoken English.
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--warning-bg)', borderLeft: '3px solid var(--warning)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                  IMPORTANT: You will NOT be able to return to previous questions. You must answer each question before moving on.
                </div>
              </>
            )}
            {section === 'writing' && 'This section measures your ability to write in English. Complete each writing task using the editor provided.'}
            {section === 'speaking' && 'This section measures your ability to speak in English. Listen carefully and record your responses when prompted.'}
          </div>
          <button className="btn-premium" style={{ width: '100%' }} onClick={beginModule}>
            {isListening ? 'Begin Listening Part' : 'Begin Section'}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'listening_audio_intro') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <ToeflNavbar
          sectionName={sectionLabel}
          counter=""
          timeRemaining={timeRemaining}
          showVolume={true}
          volume={volume}
          onVolumeChange={setVolume}
          showSubbar={true}
          showBack={false}
          showNext={false}
          subbarInfo={`${sectionLabel}${isAdaptive ? ` - ${currentModule === 'module1' ? 'Module 1' : 'Module 2'}` : ''}`}
        />
        <div className="test-layout">
          <ListenGroupAudioIntro
            key={pendingConversationAudio?.groupKey ?? `${questionIdx}`}
            directionsAudioUrl={pendingConversationAudio?.directionsAudioUrl ?? ''}
            contentAudioUrl={pendingConversationAudio?.contentAudioUrl ?? ''}
            speakerPhotoUrl={pendingConversationAudio?.speakerPhotoUrl ?? ''}
            onFinished={finishConversationAudioIntro}
          />
        </div>
      </div>
    );
  }

  if (screen === 'speaking_repeat_intro') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <ToeflNavbar
          sectionName={sectionLabel}
          counter=""
          timeRemaining={timeRemaining}
          showVolume={true}
          volume={volume}
          onVolumeChange={setVolume}
          showSubbar={true}
          showBack={false}
          showNext={false}
          subbarInfo={`${sectionLabel}${isAdaptive ? ` - ${currentModule === 'module1' ? 'Module 1' : 'Module 2'}` : ''}`}
        />
        <div className="test-layout">
          <ListenRepeatIntro
            key={pendingRepeatIntro?.groupKey ?? `${questionIdx}`}
            contextText={pendingRepeatIntro?.contextText ?? ''}
            introImageUrl={pendingRepeatIntro?.introImageUrl ?? ''}
            introAudioUrl={pendingRepeatIntro?.introAudioUrl ?? ''}
            onFinished={finishRepeatIntro}
          />
        </div>
      </div>
    );
  }

  if (screen === 'speaking_interview_intro') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <ToeflNavbar
          sectionName={sectionLabel}
          counter=""
          timeRemaining={timeRemaining}
          showVolume={true}
          volume={volume}
          onVolumeChange={setVolume}
          showSubbar={true}
          showBack={false}
          showNext={false}
          subbarInfo={`${sectionLabel}${isAdaptive ? ` - ${currentModule === 'module1' ? 'Module 1' : 'Module 2'}` : ''}`}
        />
        <div className="test-layout">
          <TakeInterviewIntro
            key={pendingInterviewIntro?.groupKey ?? `${questionIdx}`}
            contextText={pendingInterviewIntro?.contextText ?? ''}
            introImageUrl={pendingInterviewIntro?.introImageUrl ?? ''}
            introAudioUrl={pendingInterviewIntro?.introAudioUrl ?? ''}
            onFinished={finishInterviewIntro}
          />
        </div>
      </div>
    );
  }

  //  MODULE END (MST transition) 
  if (screen === 'module_end') {
    return (
      <div className="premium-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
        <ToeflNavbar sectionName={sectionLabel} showSubbar={false} showVolume={false} />
        <div className="glass-card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '32px 40px' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={{ padding: 16, background: 'var(--teal-light)', borderRadius: '50%' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--teal)', marginBottom: 8 }}>
            Phase Complete
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--deep-navy)' }}>Module 1 Finished</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            You have successfully completed the first module of the {sectionLabel} section. 
            The second module will now begin with adjusted difficulty.
          </p>
          <button className="btn-premium" style={{ width: '100%' }} onClick={startModule2}>
            Continue to Module 2
          </button>
        </div>
      </div>
    );
  }

  //  SECTION END (Completed Page)
  if (screen === 'section_end') {
    const isLast = sectionIdx === SECTION_ORDER.length - 1;
    return (
      <div className="premium-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
        <ToeflNavbar sectionName={sectionLabel} showSubbar={false} showVolume={false} />
        <div className="glass-card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '32px 40px' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={{ padding: 16, background: 'var(--success-bg)', borderRadius: '50%' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: isLast ? 'var(--accent-gold)' : 'var(--teal)', marginBottom: 8 }}>
            {isLast ? 'Examination Finalized' : `Progress: Section ${sectionIdx + 1} of 4`}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--deep-navy)' }}>
            {isLast ? 'Test Completed' : `${sectionLabel} Finished`}
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            {isLast
              ? 'Your responses have been securely recorded. You may now proceed to view your preliminary score report.'
              : `Great work. You have completed the ${sectionLabel} section. Please proceed to the next stage of the examination.`}
          </p>

          <button
            className="btn-premium"
            style={{ width: '100%' }}
            onClick={advanceSection}
            disabled={submitting}
          >
            {isLast ? (submitting ? 'Processing...' : 'View Score Report') : `Proceed to ${SECTION_LABELS[SECTION_ORDER[sectionIdx + 1]]}`}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'done') {
    return (
      <FinalSubmissionScreen
        submitting={submitting}
        error={submissionError}
        onRetry={handleSubmit}
      />
    );
  }

  //  QUESTION SCREEN 
  return (
    <div style={{ minHeight: '100vh' }}>
      <ToeflNavbar
        sectionName={sectionLabel}
        counter={counterText}
        timeRemaining={timeRemaining}
        showVolume={showVolume}
        volume={volume}
        onVolumeChange={setVolume}
        showSubbar={showSubbar}
        showBack={showBack}
        showNext={true}
        onBack={goBack}
        onNext={goNext}
        nextLabel={questionIdx >= questions.length - 1 ? 'Next Section' : 'Next'}
        nextDisabled={false}
        questionCountdown={questionCountdown}
        subbarInfo={`${sectionLabel}${isAdaptive ? ` - ${currentModule === 'module1' ? 'Module 1' : 'Module 2'}` : ''}`}
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
    <div className="premium-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass-card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
        {error ? (
          <div style={{ color: '#ef4444', marginBottom: 20 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
             <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(13, 115, 119, 0.1)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        )}
        <div style={{ color: error ? '#b91c1c' : 'var(--text-secondary)', fontSize: 16, fontWeight: 600 }}>
          {children}
        </div>
        {error && (
          <button 
            className="btn btn--sm" 
            style={{ marginTop: 24, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }}
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        )}
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function FinalSubmissionScreen({ submitting, error, onRetry }) {
  const isError = Boolean(error);

  return (
    <div className="premium-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass-card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '34px 40px' }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: isError ? 'rgba(239,68,68,0.12)' : 'var(--teal-light)',
            color: isError ? '#b91c1c' : 'var(--teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isError ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <div className="spinner" style={{ width: 34, height: 34, border: '4px solid rgba(13, 115, 119, 0.18)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: isError ? '#b91c1c' : 'var(--teal)', marginBottom: 8 }}>
          {isError ? 'Submission Interrupted' : 'Submitting Test'}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, color: 'var(--deep-navy)' }}>
          {isError ? 'We could not submit your test' : 'Saving your responses'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.65, marginBottom: 22 }}>
          {isError
            ? 'Your responses are still held on this page. Do not close or refresh this tab. Check your connection, then retry submission.'
            : 'Please keep this tab open while your answers and speaking recordings are uploaded.'}
        </p>

        {isError && (
          <div style={{ textAlign: 'left', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(254,242,242,0.9)', borderRadius: 10, padding: '12px 14px', color: '#991b1b', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {isError && (
          <button
            className="btn-premium"
            style={{ width: '100%' }}
            onClick={onRetry}
            disabled={submitting}
          >
            {submitting ? 'Retrying Submission...' : 'Retry Submission'}
          </button>
        )}
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


