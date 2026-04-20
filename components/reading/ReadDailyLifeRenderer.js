import RadioOptionList from '@/components/shared/RadioOptionList';
import HighlightedText from '@/components/shared/HighlightedText';

function parseEmailPassage(passage) {
  const lines = (passage || '').split(/\r?\n/);
  const headers = {};
  let bodyStartIndex = 0;
  let hasAnyHeader = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      bodyStartIndex = i + 1;
      continue;
    }

    const match = line.match(/^(To|From|Date|Subject):\s*(.*)$/i);
    if (!match) {
      break;
    }

    headers[match[1].toLowerCase()] = match[2];
    bodyStartIndex = i + 1;
    hasAnyHeader = true;
  }

  // If it clearly looks like an email (has at least one header or starts with Dear/Hi), handle it
  const bodyText = lines.slice(bodyStartIndex).join('\n').trim();
  const startsLikeLetter = /^(Dear|Hi|Hello|To whom)/i.test(bodyText);

  if (!hasAnyHeader && !startsLikeLetter) return null;

  const body = bodyText.replace(/^\s*-{3,}\s*/m, '').trim();

  return { headers, body };
}

function parseNoticePassage(passage) {
  const nonEmptyLines = (passage || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (nonEmptyLines.length < 3) return null;

  const [title, subtitle, ...bodyLines] = nonEmptyLines;
  const body = bodyLines.join(' ').replace(/\s+/g, ' ').trim();

  if (!title || !subtitle || !body) return null;
  if (title.length > 80 || subtitle.length > 140) return null;

  return { title, subtitle, body };
}

function DocumentContainer({ children }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        width: '100%',
        margin: '0 auto',
        color: '#1a202c',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        maxWidth: '92%',
      }}
    >
      {children}
    </div>
  );
}

function EmailDocument({ headers, body }) {
  return (
    <DocumentContainer>
      {(headers.to || headers.from || headers.subject || headers.date) && (
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #edf2f7', background: '#fcfdfe' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'min-content 16px 1fr', rowGap: 8, columnGap: 4, fontSize: 13.5, lineHeight: 1.4 }}>
            {Object.entries({
              To: headers.to,
              From: headers.from,
              Date: headers.date,
              Subject: headers.subject,
            }).map(([label, value]) => value ? (
              <div key={label} style={{ display: 'contents' }}>
                <div style={{ fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontWeight: 400, color: '#cbd5e1', textAlign: 'center' }}>:</div>
                <div style={{ fontWeight: 600, color: '#1f2937' }}>{value}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      <div className="passage-text" style={{ padding: '24px', fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1a202c' }}>
        <HighlightedText text={(body || '').replace(/\n{3,}/g, '\n\n').trim()} />
      </div>
    </DocumentContainer>
  );
}

function GenericDocument({ passage }) {
  return (
    <DocumentContainer>
      <div className="passage-text" style={{ padding: '32px 36px', fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
        <HighlightedText text={passage || 'Sample daily life reading passage will appear here (e.g. schedule, flyer, email, or announcement).'} />
      </div>
    </DocumentContainer>
  );
}

function NoticeDocument({ title, subtitle, body }) {
  return (
    <div
      style={{
        background: '#ececec',
        border: '2px solid #5b5b5b',
        width: '100%',
        margin: '0 auto',
        padding: 8,
        maxWidth: '95%',
      }}
    >
      <div
        style={{
          border: '1px solid #8a8a8a',
          padding: '16px 22px 18px',
          background: 'transparent',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 700, color: '#111', fontFamily: 'Arial, sans-serif' }}>
            <HighlightedText text={title} />
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.25, fontWeight: 700, color: '#111', marginTop: 2, fontFamily: 'Arial, sans-serif' }}>
            <HighlightedText text={subtitle} />
          </div>
        </div>

        <div className="passage-text" style={{ fontSize: 16, lineHeight: 1.5, color: '#111', fontFamily: 'Arial, sans-serif' }}>
          <HighlightedText text={body} />
        </div>
      </div>
    </div>
  );
}

/**
 * Read in Daily Life Renderer
 * Split layout: phone/document mockup on left, MCQ on right
 * Confirmed from ETS screenshots.
 */
export default function ReadDailyLifeRenderer({ passage = '', question, options = [], selected, onSelect, questionNumber, totalQuestions }) {
  const emailDocument = parseEmailPassage(passage);
  const noticeDocument = !emailDocument ? parseNoticePassage(passage) : null;
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4);

  return (
    <div className="split-layout" style={{ height: 'calc(100vh - 96px)', background: '#fff' }}>
      <div
        className="split-pane split-pane--left"
        style={{
          background: '#f8fafc', 
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '60px 24px 24px',
          overflowY: 'auto'
        }}
      >
        {emailDocument ? (
          <EmailDocument headers={emailDocument.headers} body={emailDocument.body} />
        ) : noticeDocument ? (
          <NoticeDocument title={noticeDocument.title} subtitle={noticeDocument.subtitle} body={noticeDocument.body} />
        ) : (
          <GenericDocument passage={passage} />
        )}
      </div>

      <div className="split-pane split-pane--right" style={{ background: '#fff', padding: '60px 80px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', padding: '4px 10px', background: 'var(--teal-light)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question {questionNumber}
            </span>
          </div>

          <p style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 40, lineHeight: 1.55 }}>
            {question ?? 'What is the main purpose of this text?'}
          </p>

          <RadioOptionList options={choices} selected={selected} onSelect={onSelect} gap={24} fontSize={16} />
        </div>
      </div>
    </div>
  );
}
