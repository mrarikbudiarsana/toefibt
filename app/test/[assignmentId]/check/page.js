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
  welcome:      'Welcome to the TOEFL iBT',
  requirements: 'System Requirements',
  microphone:   'Microphone Test',
  speakers:     'Speaker / Headphone Test',
  environment:  'Testing Environment',
  identity:     'Identity & Security',
  ready:        'You\'re Ready!',
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
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      setMicStatus('active');

      const tick = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, (avg / 128) * 100 * 2));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMicStatus('error');
    }
  }

  function playTestTone() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.value = 0.3;
    osc.start();
    setSpeakerPlaying(true);
    setTimeout(() => {
      osc.stop();
      setSpeakerPlaying(false);
      setSpeakerTested(true);
    }, 1500);
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

  function beginTest() {
    router.push(`/test/${assignmentId}`);
  }

  const isFirst = screenIdx === 0;
  const isLast = screenIdx === SCREENS.length - 1;

  return (
    <div className="hwcheck">
      {/* Fixed header */}
      <header className="hwcheck__header">
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
          TOEFL
        </div>
        <span>TOEFL iBT - Equipment Check</span>
      </header>

      {/* Card */}
      <div className="hwcheck__card">
        <p className="hwcheck__step">
          Step {screenIdx + 1} of {SCREENS.length} - {screen.replace('_', ' ').toUpperCase()}
        </p>
        <h2 className="hwcheck__title">{SCREEN_TITLES[screen]}</h2>

        {/*  WELCOME  */}
        {screen === 'welcome' && (
          <>
            <p className="hwcheck__desc">
              Before you begin your TOEFL iBT test, we need to check that your equipment is working properly. This check takes about 3 minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
              {['Microphone', 'Speakers', 'System', 'Identity'].map(item => (
                <span key={item} style={{ background: 'var(--teal-light)', color: 'var(--teal)', borderRadius: 100, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>{item}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              This is a simulation of the official ETS TOEFL iBT equipment check.
            </p>
          </>
        )}

        {/*  REQUIREMENTS  */}
        {screen === 'requirements' && (
          <>
            <p className="hwcheck__desc">Verify your system meets the following requirements:</p>
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              {[
                { icon: 'OK', label: 'Browser', ok: true, detail: 'Chrome, Firefox, Edge, or Safari (latest)' },
                { icon: 'OK', label: 'Internet', ok: true, detail: 'Stable connection recommended (2 Mbps+)' },
                { icon: 'OK', label: 'Screen', ok: true, detail: 'Minimum 1024x768 resolution' },
                { icon: 'OK', label: 'Microphone', ok: true, detail: 'Required for Speaking section' },
                { icon: 'OK', label: 'Audio output', ok: true, detail: 'Speakers or headphones required' },
              ].map(req => (
                <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 22 }}>{req.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{req.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{req.detail}</div>
                  </div>
                  <span style={{ color: 'var(--success)', fontSize: 14, fontWeight: 700 }}>OK</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/*  MICROPHONE  */}
        {screen === 'microphone' && (
          <>
            <p className="hwcheck__desc">
              Speak into your microphone. The green bar below should move as you speak. This confirms your mic is working for the Speaking section.
            </p>
            {micStatus === 'idle' && (
              <button className="btn btn--primary btn--full" style={{ marginBottom: 20 }} onClick={startMic}>
                Test My Microphone
              </button>
            )}
            {micStatus === 'requesting' && (
              <p style={{ color: 'var(--teal)', marginBottom: 20, fontSize: 14 }}>Requesting microphone access</p>
            )}
            {micStatus === 'error' && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--danger)' }}>
                Microphone access was denied. Please allow microphone access in your browser settings and try again.
                <br />
                <button className="btn btn--sm btn--outline" style={{ marginTop: 10, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={startMic}>Retry</button>
              </div>
            )}
            {micStatus === 'active' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Microphone level</span>
                  <span style={{ fontWeight: 600, color: micLevel > 20 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {micLevel > 20 ? 'Detected' : 'Speak now'}
                  </span>
                </div>
                <div className="vol-meter">
                  <div className="vol-meter__fill" style={{ width: `${micLevel}%` }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Say &quot;Hello, this is my microphone test&quot; - the bar should move.
                </p>
              </div>
            )}
          </>
        )}

        {/*  SPEAKERS  */}
        {screen === 'speakers' && (
          <>
            <p className="hwcheck__desc">
              Click the button below to play a test tone. Make sure your speakers or headphones are connected and the volume is turned up.
            </p>
            <button
              className="btn btn--primary btn--full"
              style={{ marginBottom: 20 }}
              onClick={playTestTone}
              disabled={speakerPlaying}
            >
              {speakerPlaying ? 'Playing' : 'Play Test Tone'}
            </button>
            {speakerTested && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>
                Audio test complete. If you heard the tone, your speakers are working.
              </div>
            )}
            {!speakerTested && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Note: During the test, audio will play automatically for Listening questions.
              </p>
            )}
          </>
        )}

        {/*  ENVIRONMENT  */}
        {screen === 'environment' && (
          <>
            <p className="hwcheck__desc">
              Please confirm your testing environment. Your score may be invalidated if these conditions are not met.
            </p>
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              {[
                'I am alone in a quiet room',
                'My desk is clear of notes and unauthorized materials',
                'No other person can see my screen',
                'I will not leave the testing window during the test',
              ].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" style={{ marginTop: 2, accentColor: 'var(--teal)' }} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/*  IDENTITY  */}
        {screen === 'identity' && (
          <>
            <p className="hwcheck__desc">
              Before the test, please have your valid government-issued photo ID ready. Your instructor may verify your identity before releasing your score.
            </p>
            <div style={{ background: 'var(--warning-bg)', border: '1px solid #fcd34d', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--warning)', marginBottom: 24, textAlign: 'left' }}>
              <strong>Important:</strong> This is a proctored mock test. Impersonation or academic dishonesty will result in disqualification.
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              By continuing, you agree to test honestly and abide by the English with Arik test-taking rules.
            </p>
          </>
        )}

        {/*  READY  */}
        {screen === 'ready' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>Ready</div>
            <p className="hwcheck__desc">
              Your equipment is set up and you are ready to begin. The test will start with <strong>Reading</strong>, followed by Listening, Writing, and Speaking.
            </p>
            <div style={{ background: 'var(--teal-light)', border: '1px solid #a7d7d9', borderRadius: 8, padding: '14px 16px', fontSize: 13, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 8 }}>Test Structure</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--teal-dark)' }}>
                <span>Reading - ~36 minutes</span>
                <span>Listening - ~36 minutes</span>
                <span>Writing - ~29 minutes</span>
                <span>Speaking - ~16 minutes</span>
              </div>
              <div style={{ marginTop: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Total: ~117 minutes</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 24 }}>
              Once you begin, do not close the browser window.
            </p>
            <button className="btn btn--primary btn--full btn--lg" onClick={beginTest}>
              Begin TOEFL iBT Test
            </button>
          </>
        )}

        {/* Navigation */}
        {!isLast && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {!isFirst && (
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={goPrev}>
                Back
              </button>
            )}
            <button className="btn btn--primary" style={{ flex: isFirst ? 1 : 2 }} onClick={goNext}>
              {screenIdx === SCREENS.length - 2 ? 'Finish Check' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step dots */}
        <div className="hwcheck__dots">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className={`hwcheck__dot ${i === screenIdx ? 'active' : i < screenIdx ? 'done' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

