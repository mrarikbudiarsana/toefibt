'use client';

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
}) {
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
            <button className="ets-navbar__btn" aria-label="Volume" title="Adjust volume">
              🔊 Volume
            </button>
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
