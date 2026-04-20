'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * ETS-accurate TOEFL iBT Navbar
 *
 * Rules from Master Reference Document:
 * - Always teal (#0D7377) background
 * - Left: logo + section name
 * - Center: question counter (e.g. "Question 3 of 20")
 * - Right: Volume button + timer + Help
 * - Volume button NOT shown on section intro, module end, section end screens
 * - Sub-bar below: Back/Next buttons (Reading only on question screens)
 */

export default function ToeflNavbar({
  sectionName = '',
  counter = '',         // e.g. "Question 3 of 20"
  timeRemaining = null, // seconds
  showVolume = true,
  volume = 1,
  onVolumeChange,
  onHelp,
  // Sub-bar props
  showSubbar = true,
  showBack = false,
  showNext = true,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  subbarInfo = '',
  questionCountdown = null, // seconds, for per-question timed tasks
}) {
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const volumePanelRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (!showVolumePanel) return;
      if (!volumePanelRef.current?.contains(event.target)) {
        setShowVolumePanel(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showVolumePanel]);

  const minutes = timeRemaining != null ? Math.floor(timeRemaining / 60) : null;
  const seconds = timeRemaining != null ? timeRemaining % 60 : null;
  const timeStr = timeRemaining != null
    ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : null;

  return (
    <>
      {/* Main navbar */}
      <nav className="ets-navbar" role="banner">
        <div className="ets-navbar__left">
          <span className="ets-navbar__logo">TOEFL iBT®</span>
          {sectionName && (
            <span className="ets-navbar__section">{sectionName}</span>
          )}
        </div>

        {counter && (
          <div className="ets-navbar__center" aria-live="polite">
            {counter}
          </div>
        )}

        <div className="ets-navbar__right">
          {showVolume && (
            <div ref={volumePanelRef} style={{ position: 'relative' }}>
              <button
                className="ets-navbar__btn"
                onClick={() => setShowVolumePanel(prev => !prev)}
                aria-label="Volume"
                title="Adjust volume"
                type="button"
              >
                🔊 Volume
              </button>
              {showVolumePanel && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    minWidth: 180,
                    zIndex: 1200,
                  }}
                >
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
                    Volume: {Math.round((volume ?? 1) * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((volume ?? 1) * 100)}
                    onChange={event => onVolumeChange?.(Number(event.target.value) / 100)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          )}
          {timeStr && (
            <div className="ets-navbar__timer" aria-label={`Time remaining: ${timeStr}`}>
              ⏱ {timeStr}
            </div>
          )}
          <button
            className="ets-navbar__btn"
            onClick={onHelp}
            aria-label="Help"
          >
            Help
          </button>
        </div>
      </nav>

      {/* Sub-bar */}
      {showSubbar && (
        <div className="ets-subbar" role="navigation" aria-label="Question navigation">
          <span className="ets-subbar__info">{subbarInfo}</span>
          <div className="ets-subbar__nav">
            {questionCountdown != null && (
              <span
                style={{
                  alignSelf: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: 6,
                  padding: '5px 10px',
                  marginRight: 8,
                  minWidth: 62,
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}
                aria-live="polite"
              >
                00:{String(Math.max(0, questionCountdown)).padStart(2, '0')}
              </span>
            )}
            {showBack && (
              <button
                className="ets-subbar__nav-btn"
                onClick={onBack}
                aria-label="Previous question"
              >
                ← Back
              </button>
            )}
            <button
              className="ets-subbar__nav-btn"
              onClick={onNext}
              disabled={nextDisabled}
              aria-label="Next question"
            >
              {nextLabel} →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
