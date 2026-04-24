'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

//  Screen definitions 
const SCREENS = [
  'welcome',
  'requirements',
  'microphone',
  'speakers',
  'environment',
  'identity',
  'ready',
];

const SCREEN_TITLES = {
  welcome: 'Welcome to the TOEFL iBT Practice Test',
  requirements: 'System Requirements',
  microphone: 'Microphone Test',
  speakers: 'Audio Test',
  environment: 'Testing Environment',
  identity: 'Identity & Security',
  ready: 'You\'re Ready!',
};

export default function HardwareCheckPage() {
  const router = useRouter();
  const { assignmentId } = useParams();
  const [screenIdx, setScreenIdx] = useState(0);
  const screen = SCREENS[screenIdx];

  // Mic state
  const [micLevel, setMicLevel] = useState(0);
  const [micStatus, setMicStatus] = useState('idle'); // idle | requesting | active | error
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);

  // Speaker state
  const [speakerTested, setSpeakerTested] = useState(false);
  const [speakerPlaying, setSpeakerPlaying] = useState(false);
  const [speakerWaveData, setSpeakerWaveData] = useState(new Array(32).fill(128));
  const [isSpeakerConfirmed, setIsSpeakerConfirmed] = useState(false);

  // Mic calibration & waveform state
  const [micProgress, setMicProgress] = useState(0); // 0-100
  const [waveData, setWaveData] = useState(new Array(32).fill(128));
  const [isMicCalibrated, setIsMicCalibrated] = useState(false);

  // Requirements state
  const [reqStatus, setReqStatus] = useState({
    browser: 'idle',
    internet: 'idle',
    screen: 'idle',
    microphone: 'idle',
    audio: 'idle'
  });

  const stopMic = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
    setMicStatus('idle');
  }, []);

  // Cleanup mic on unmount
  useEffect(() => () => stopMic(), [stopMic]);

  async function startMic() {
    setMicStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      setMicStatus('active');
      setMicProgress(0);
      setIsMicCalibrated(false);

      const tick = () => {
        if (!analyserRef.current) return;

        // 1. Level Analysis
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        const level = Math.min(100, (avg / 128) * 100 * 2.5);
        setMicLevel(level);

        // 2. Waveform Analysis
        const timeData = new Uint8Array(32);
        analyserRef.current.getByteTimeDomainData(timeData);
        setWaveData(Array.from(timeData));

        // 3. Calibration Logic (VAD-ish)
        // If volume is above threshold (35), increment progress
        if (avg > 35) {
          setMicProgress(prev => {
            const next = Math.min(100, prev + 0.8); // ~2-3 seconds of speech to reach 100
            if (next === 100) setIsMicCalibrated(true);
            return next;
          });
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicStatus('error');
    }
  }

  function playTestTone() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.connect(ctx.destination);

    const playNote = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(analyser);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    playNote(440, now, 0.4);      // A4
    playNote(554.37, now + 0.4, 0.4); // C#5
    playNote(659.25, now + 0.8, 0.6); // E5

    setSpeakerPlaying(true);
    setSpeakerTested(false);
    setIsSpeakerConfirmed(false);

    const startTime = Date.now();
    const duration = 1500;

    const tick = () => {
      if (Date.now() - startTime > duration) {
        setSpeakerPlaying(false);
        setSpeakerTested(true);
        setSpeakerWaveData(new Array(32).fill(128));
        return;
      }
      const data = new Uint8Array(32);
      analyser.getByteTimeDomainData(data);
      setSpeakerWaveData(Array.from(data));
      requestAnimationFrame(tick);
    };
    tick();
  }

  // When leaving mic screen, stop mic
  function goNext() {
    if (screen === 'microphone') stopMic();
    if (screenIdx < SCREENS.length - 1) setScreenIdx(i => i + 1);
  }

  function goPrev() {
    if (screen === 'microphone') stopMic();
    if (screenIdx > 0) setScreenIdx(i => i - 1);
  }

  // Verification Logic
  const runRequirementChecks = useCallback(async () => {
    // 1. Browser check
    const ua = navigator.userAgent;
    const isSupported = /Chrome|Safari|Firefox|Edg/.test(ua) && !/OPR|Opera/.test(ua);
    setReqStatus(s => ({ ...s, browser: isSupported ? 'success' : 'error' }));

    // 2. Screen check
    const checkScreenSize = () => {
      const ok = window.innerWidth >= 1024 && (window.innerHeight >= 620 || screen.height >= 768);
      setReqStatus(s => ({ ...s, screen: ok ? 'success' : 'error' }));
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    // 3. Audio engine check
    const hasAudio = !!(window.AudioContext || window.webkitAudioContext);
    setReqStatus(s => ({ ...s, audio: hasAudio ? 'success' : 'error' }));

    // 4. Microphone check (just enumeration)
    const checkMic = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const ok = devices.some(d => d.kind === 'audioinput');
        setReqStatus(s => ({ ...s, microphone: ok ? 'success' : 'error' }));
      } catch {
        setReqStatus(s => ({ ...s, microphone: 'error' }));
      }
    };
    checkMic();

    // 5. Internet check
    setReqStatus(s => ({ ...s, internet: 'checking' }));
    try {
      // Basic connectivity check
      if (!navigator.onLine) throw new Error();
      // Try to fetch a small local resource to verify actual route
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      setReqStatus(s => ({ ...s, internet: 'success' }));
    } catch {
      setReqStatus(s => ({ ...s, internet: 'error' }));
    }

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (screen === 'requirements') {
      let cleanup;
      runRequirementChecks().then(c => { cleanup = c; });
      return () => { if (cleanup) cleanup(); };
    }
  }, [screen, runRequirementChecks]);

  const allRequirementsMet =
    reqStatus.browser === 'success' &&
    reqStatus.screen === 'success' &&
    reqStatus.microphone === 'success' &&
    reqStatus.audio === 'success' &&
    reqStatus.internet === 'success';

  const isContinueDisabled =
    (screen === 'requirements' && !allRequirementsMet) ||
    (screen === 'microphone' && !isMicCalibrated) ||
    (screen === 'speakers' && !isSpeakerConfirmed);

  function beginTest() {
    router.push(`/test/${assignmentId}`);
  }

  const isFirst = screenIdx === 0;
  const isLast = screenIdx === SCREENS.length - 1;

  return (
    <div className="premium-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Fixed transparent glass header */}
      <header style={{
        height: 64,
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 16,
        zIndex: 100,
        position: 'sticky',
        top: 0
      }}>

        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--teal-dark)', letterSpacing: '-0.02em' }}>
          TOEFL iBT &middot; <span style={{ opacity: 0.7 }}>Equipment Check</span>
        </span>
      </header>

      {/* Main content centered */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: 640, padding: 32, textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: 'rgba(13, 115, 119, 0.08)',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--teal)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 12,
            border: '1px solid rgba(13, 115, 119, 0.15)'
          }}>
            Step {screenIdx + 1} of {SCREENS.length} &middot; {screen.replace('_', ' ')}
          </div>
          <h2 style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#1a1a2e',
            marginBottom: 12,
            letterSpacing: '-0.03em',
            lineHeight: 1.1
          }}>
            {SCREEN_TITLES[screen]}
          </h2>

          {/*  WELCOME  */}
          {screen === 'welcome' && (
            <>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Before you begin your TOEFL iBT practice test, we need to check that your equipment is working properly. This check takes about 3 minutes.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                {[
                  { name: 'Microphone', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg> },
                  { name: 'Speakers', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> },
                  { name: 'System', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
                  { name: 'Identity', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> }
                ].map(item => (
                  <div key={item.name} style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(13, 115, 119, 0.12)',
                    color: 'var(--teal-dark)',
                    borderRadius: 100,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(13, 115, 119, 0.04)',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', background: 'var(--teal)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{item.icon}</span>
                    {item.name}
                  </div>
                ))}
              </div>
              <div style={{
                background: 'rgba(13, 115, 119, 0.05)',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 11,
                color: 'var(--teal-dark)',
                fontWeight: 500,
                maxWidth: 400,
                margin: '0 auto 20px',
                border: '1px solid rgba(13, 115, 119, 0.1)'
              }}>
                This is not an official check; it’s only a simulation.
              </div>
            </>
          )}

          {/*  REQUIREMENTS  */}
          {screen === 'requirements' && (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>Verify your system meets the following requirements:</p>
              <div style={{ textAlign: 'left', marginBottom: 20, background: 'rgba(255,255,255,0.4)', borderRadius: 16, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.5)' }}>
                {[
                  { id: 'browser', label: 'Browser', detail: 'Chrome, Firefox, Edge, or Safari (latest)' },
                  { id: 'internet', label: 'Internet', detail: 'Stable connection recommended' },
                  { id: 'screen', label: 'Screen', detail: 'Minimum 1024x768 resolution' },
                  { id: 'microphone', label: 'Microphone', detail: 'Required for Speaking section' },
                  { id: 'audio', label: 'Audio Engine', detail: 'Advanced web audio support' },
                ].map((req, i) => {
                  const status = reqStatus[req.id];
                  const isSuccess = status === 'success';
                  const isError = status === 'error';
                  const isChecking = status === 'checking';

                  return (
                    <div key={req.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '8px 0',
                      borderBottom: i === 4 ? 'none' : '1px solid rgba(13, 115, 119, 0.1)'
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isSuccess ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : isError ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : '#f1f5f9',
                        color: isSuccess || isError ? '#fff' : '#94a3b8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                        boxShadow: isSuccess ? '0 4px 10px rgba(46, 204, 113, 0.3)' : isError ? '0 4px 10px rgba(231, 76, 60, 0.3)' : 'none',
                        opacity: isChecking ? 0.6 : 1
                      }}>
                        {isSuccess ? '✓' : isError ? '!' : '…'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{req.label}</div>
                        <div style={{ fontSize: 12, color: isError ? '#ef4444' : 'var(--text-secondary)', opacity: 0.8 }}>
                          {isError && req.id === 'screen' ? 'Please maximize your window' : req.detail}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        background: isSuccess ? '#ecfdf5' : isError ? '#fef2f2' : '#f8fafc',
                        color: isSuccess ? '#10b981' : isError ? '#ef4444' : '#64748b',
                        borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase'
                      }}>
                        {isSuccess ? 'Ready' : isError ? 'Failed' : isChecking ? 'Testing' : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {/*  MICROPHONE  */}
          {screen === 'microphone' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                Speak naturally for a few seconds to calibrate your device. The system will confirm once a clear signal is detected.
              </p>

              <div className="glass-card" style={{
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: 20,
                padding: '20px',
                border: '1px solid var(--glass-border)',
                marginBottom: 12,
                boxShadow: 'none',
                textAlign: 'left'
              }}>
                {micStatus === 'idle' && (
                  <button
                    className="btn-premium"
                    style={{
                      width: '100%',
                      padding: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      background: 'linear-gradient(135deg, #148f94, #0D7377, #095f63)',
                      borderTop: '1px solid rgba(255,255,255,0.2)',
                      fontSize: 14,
                      letterSpacing: '0.08em',
                      animation: 'pulseGlow 3s infinite'
                    }}
                    onClick={startMic}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    Initialize Voice Calibration
                  </button>
                )}
                {micStatus === 'requesting' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--teal)', fontWeight: 600, fontSize: 13 }}>Requesting access...</p>
                  </div>
                )}
                {micStatus === 'error' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 4, fontSize: 14 }}>Access Blocked</div>
                    <p style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5, marginBottom: 12 }}>
                      Microphone access was denied. Please check your browser&apos;s permission settings.
                    </p>
                    <button className="btn btn--sm" style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: 12 }} onClick={startMic}>Retry</button>
                  </div>
                )}
                {micStatus === 'active' && (
                  <div>
                    {/* Visualizer Row */}
                    <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '12px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signal Analyzer</span>
                        <span style={{ fontSize: 10, color: isMicCalibrated ? '#10b981' : '#f59e0b', fontWeight: 800, textTransform: 'uppercase' }}>
                          {isMicCalibrated ? '● CALIBRATED' : '○ CAPTURING VOICE...'}
                        </span>
                      </div>

                      {/* Waveform SVG */}
                      <svg width="100%" height="40" viewBox="0 0 320 40" preserveAspectRatio="none">
                        <path
                          d={`M ${waveData.map((v, i) => `${i * 10},${20 + (v - 128) * 0.5}`).join(' L ')}`}
                          fill="none"
                          stroke="var(--teal-mid)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          style={{ transition: 'd 0.05s linear' }}
                        />
                      </svg>

                      {/* VU Meter Segments */}
                      <div style={{ display: 'flex', gap: 3, height: 14, marginTop: 12 }}>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} style={{
                            flex: 1,
                            borderRadius: 2,
                            background: (micLevel > (i / 24) * 100)
                              ? (i > 20 ? '#ef4444' : i > 16 ? '#f59e0b' : '#10b981')
                              : 'rgba(255,255,255,0.1)',
                            boxShadow: (micLevel > (i / 24) * 100) ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                            transition: 'all 0.1s ease'
                          }} />
                        ))}
                      </div>
                    </div>

                    {/* Calibration Progress */}
                    <div style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: '#64748b' }}>CALIBRATION PROGRESS</span>
                        <span style={{ color: 'var(--teal)' }}>{Math.round(micProgress)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${micProgress}%`,
                          background: 'var(--teal)', transition: 'width 0.3s ease',
                          boxShadow: '0 0 10px rgba(13, 115, 119, 0.2)'
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/*  AUDIO TEST  */}
          {screen === 'speakers' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Click the button below to test your audio output. You should hear a short melodic sequence.
              </p>

              <div className="glass-card" style={{
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: 20,
                padding: '20px',
                border: '1px solid var(--glass-border)',
                marginBottom: 12,
                boxShadow: 'none',
                textAlign: 'left'
              }}>
                <button
                  className="btn-premium"
                  style={{
                    width: '100%',
                    padding: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    background: speakerPlaying ? 'var(--deep-navy)' : 'linear-gradient(135deg, #148f94, #0D7377, #095f63)',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    fontSize: 14,
                    letterSpacing: '0.08em',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={playTestTone}
                  disabled={speakerPlaying}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  {speakerPlaying ? 'Generating Audio...' : 'Play Test Sequence'}
                </button>

                {/* Output Monitor */}
                <div style={{
                  background: '#1a1a2e',
                  borderRadius: 12,
                  padding: '12px',
                  marginTop: 16,
                  height: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Output Monitor</span>
                    {speakerPlaying && <span className="audio-wave__bar" style={{ width: 4, height: 10, background: '#10b981' }} />}
                  </div>
                  <svg width="100%" height="24" viewBox="0 0 320 24" preserveAspectRatio="none">
                    <path
                      d={`M ${speakerWaveData.map((v, i) => `${i * 10},${12 + (v - 128) * 0.4}`).join(' L ')}`}
                      fill="none"
                      stroke={speakerPlaying ? '#10b981' : '#334155'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{ transition: 'all 0.05s linear' }}
                    />
                  </svg>
                </div>

                {speakerTested && !speakerPlaying && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 12, textAlign: 'center' }}>
                      Did you hear the test sound clearly?
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        className="btn"
                        style={{
                          flex: 1,
                          background: isSpeakerConfirmed ? '#10b981' : '#fff',
                          color: isSpeakerConfirmed ? '#fff' : '#10b981',
                          border: '2px solid #10b981',
                          borderRadius: 10,
                          fontWeight: 800
                        }}
                        onClick={() => setIsSpeakerConfirmed(true)}
                      >
                        {isSpeakerConfirmed ? '✓ Yes, Confirmed' : 'Yes, I heard it'}
                      </button>
                      <button
                        className="btn"
                        style={{
                          flex: 1,
                          background: '#fff',
                          color: '#64748b',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          fontWeight: 700
                        }}
                        onClick={playTestTone}
                      >
                        No, Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/*  ENVIRONMENT  */}
          {screen === 'environment' && (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Please confirm your testing environment. Your score may be invalidated if these conditions are not met.
              </p>
              <div style={{ textAlign: 'left', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'I am alone in a quiet room',
                  'My desk is clear of notes and unauthorized materials',
                  'No other person can see my screen',
                  'I will not leave the testing window during the test',
                ].map(item => (
                  <label key={item} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.4)',
                    borderRadius: 12,
                    border: '1px solid rgba(13, 115, 119, 0.1)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1a2e',
                    transition: 'background 0.2s'
                  }}>
                    <input type="checkbox" style={{
                      width: 20,
                      height: 20,
                      accentColor: 'var(--teal)',
                      cursor: 'pointer'
                    }} />
                    {item}
                  </label>
                ))}
              </div>
            </>
          )}

          {/*  IDENTITY  */}
          {screen === 'identity' && (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Before the test, please have your valid government-issued photo ID ready. Your instructor may verify your identity before releasing your score.
              </p>
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 16,
                padding: '12px 16px',
                fontSize: 13,
                color: '#92400e',
                marginBottom: 16,
                textAlign: 'left',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)'
              }}>
                <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.1em', marginBottom: 8, color: '#b45309' }}>Security Notice</div>
                <p style={{ lineHeight: 1.6 }}>
                  <strong>Important:</strong> This is a proctored mock test. Impersonation or academic dishonesty will result in disqualification and score invalidation.
                </p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', italic: true }}>
                By continuing, you agree to test honestly and abide by the English with Arik test-taking rules.
              </p>
            </>
          )}

          {/*  READY  */}
          {screen === 'ready' && (
            <>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px',
                boxShadow: '0 8px 24px rgba(46, 204, 113, 0.3)'
              }}>✓</div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>Check Complete</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                Setup successful. The test will start with <strong>Reading</strong>, followed by Listening, Writing, and Speaking.
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid var(--glass-border)',
                borderRadius: 16,
                padding: '12px',
                textAlign: 'left',
                marginBottom: 12
              }}>
                <div style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Test Structure</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { section: 'Reading', time: '~36m' },
                    { section: 'Listening', time: '~36m' },
                    { section: 'Writing', time: '~29m' },
                    { section: 'Speaking', time: '~16m' }
                  ].map(s => (
                    <div key={s.section} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                      <span style={{ color: '#64748b' }}>{s.section}</span>
                      <span style={{ color: 'var(--teal-dark)' }}>{s.time}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#1a1a2e', fontSize: 13 }}>
                  <span>Total Duration</span>
                  <span>~117 minutes</span>
                </div>
              </div>

              <button className="btn-premium" style={{ width: '100%', padding: '12px', fontSize: 14 }} onClick={beginTest}>
                Begin TOEFL iBT Test Now
              </button>
              <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginTop: 10 }}>
                Do not close the browser after starting.
              </p>
            </>
          )}

          {/* Navigation */}
          {!isLast && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {!isFirst && (
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#64748b'
                  }}
                  onClick={goPrev}
                >
                  Back
                </button>
              )}
              <button
                className="btn"
                style={{
                  flex: isFirst ? 1 : 2,
                  background: 'var(--teal)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxShadow: '0 4px 12px rgba(13,115,119,0.2)',
                  opacity: isContinueDisabled ? 0.5 : 1,
                  cursor: isContinueDisabled ? 'not-allowed' : 'pointer'
                }}
                onClick={goNext}
                disabled={isContinueDisabled}
              >
                {screenIdx === SCREENS.length - 2 ? 'Complete & Finish' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {SCREENS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === screenIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === screenIdx ? 'var(--teal)' : i < screenIdx ? 'var(--teal-mid)' : 'rgba(0,0,0,0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: i <= screenIdx ? 1 : 0.3
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

