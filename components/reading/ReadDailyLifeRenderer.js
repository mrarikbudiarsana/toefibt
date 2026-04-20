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

function parseSocialPostPassage(passage) {
  const lines = (passage || '').split(/\r?\n/);
  if (lines.length === 0) return null;

  let index = 0;
  const firstLine = (lines[0] || '').trim();
  const hasSocialMarker = /^(\[social-post\]|social-post:?)$/i.test(firstLine);
  if (hasSocialMarker) {
    index = 1;
  }

  const meta = {};
  for (; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      break;
    }
    const match = line.match(/^(name|author|user|handle):\s*(.+)$/i);
    if (!match) break;
    meta[match[1].toLowerCase()] = match[2].trim();
  }

  const body = lines.slice(index).join('\n').trim();
  const name = meta.name || meta.author || meta.user || '';
  const handle = meta.handle || '';

  if (hasSocialMarker) {
    if (!body) return null;
    return {
      name: name || 'Social User',
      handle,
      body,
    };
  }

  const nonEmptyLines = lines.map(line => line.trim()).filter(Boolean);
  if (nonEmptyLines.length < 2) return null;

  const inferredName = nonEmptyLines[0];
  const inferredBody = nonEmptyLines.slice(1).join('\n').trim();
  const isLikelyName = inferredName.length <= 40 && !/[.!?:]$/.test(inferredName);
  const looksLikeBody = inferredBody.length >= 80;

  if (!name && isLikelyName && looksLikeBody) {
    return {
      name: inferredName,
      handle: '',
      body: inferredBody,
    };
  }

  if (name && body) {
    return {
      name,
      handle,
      body,
    };
  }

  return null;
}

function normalizeDailyLifePassage(passage) {
  if (passage && typeof passage === 'object' && !Array.isArray(passage)) {
    return {
      type: passage.type || 'auto',
      text: passage.text || '',
      title: passage.title || '',
      subtitle: passage.subtitle || '',
      body: passage.body || '',
      to: passage.to || '',
      from: passage.from || '',
      date: passage.date || '',
      subject: passage.subject || '',
      name: passage.name || '',
      handle: passage.handle || '',
    };
  }

  return {
    type: 'auto',
    text: typeof passage === 'string' ? passage : String(passage ?? ''),
    title: '',
    subtitle: '',
    body: '',
    to: '',
    from: '',
    date: '',
    subject: '',
    name: '',
    handle: '',
  };
}

function DocumentContainer({ children }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
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
    <div
      style={{
        width: '100%',
        maxWidth: '95%',
        margin: '0 auto',
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: 10,
      }}
    >
      <div
        style={{
          border: '1px solid #bfc8d4',
          background: '#f8fafc',
          padding: 10,
        }}
      >
        <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
          {Object.entries({
            To: headers.to,
            From: headers.from,
            Date: headers.date,
            Subject: headers.subject,
          }).map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8 }}>
              <div
                style={{
                  border: '1px solid #8a96a8',
                  background: '#eaf0f5',
                  padding: '5px 8px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {label}:
              </div>
              <div
                style={{
                  border: '1px solid #8a96a8',
                  background: '#fff',
                  padding: '5px 8px',
                  fontSize: 13,
                  color: '#111827',
                  fontFamily: 'Arial, sans-serif',
                  minHeight: 30,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <HighlightedText text={value || ''} />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            border: '1px solid #8a96a8',
            background: '#fff',
            padding: '12px 14px',
            minHeight: 420,
            maxHeight: 520,
            overflowY: 'auto',
          }}
        >
          <div className="passage-text" style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', color: '#111827', fontFamily: 'Arial, sans-serif' }}>
            <HighlightedText text={(body || '').replace(/\n{3,}/g, '\n\n').trim()} />
          </div>
        </div>
      </div>
    </div>
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
        background: '#fff',
        border: '1px solid #e2e8f0',
        width: '100%',
        margin: '0 auto',
        padding: 4,
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

function SocialPostDocument({ name, handle, body }) {
  const initials = (name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'S';

  const cleanBody = (body || '').replace(/\n{3,}/g, '\n\n').trim();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '95%',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 26,
        padding: 10,
      }}
    >
      <div
        style={{
          border: '2px solid #2f2f2f',
          borderRadius: 20,
          background: '#efefef',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 34, background: '#0e7f84' }} />
        <div style={{ padding: '16px 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#de915a',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 700, color: '#111', fontFamily: 'Arial, sans-serif' }}>
                <HighlightedText text={name || 'Social User'} />
              </div>
              {handle && (
                <div style={{ marginTop: 2, fontSize: 16, lineHeight: 1.2, color: '#4b5563', fontFamily: 'Arial, sans-serif' }}>
                  <HighlightedText text={`@${handle.replace(/^@+/, '')}`} />
                </div>
              )}
            </div>
          </div>

          <div className="passage-text" style={{ fontSize: 14, lineHeight: 1.45, color: '#111', whiteSpace: 'pre-wrap', fontFamily: 'Arial, sans-serif' }}>
            <HighlightedText text={cleanBody} />
          </div>

          <div style={{ marginTop: 12, borderTop: '1px solid #a7a7a7', paddingTop: 8, display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>
            <span>Like</span>
            <span>Comment</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReadDailyLifeRenderer({ passage = '', question, options = [], selected, onSelect, questionNumber, totalQuestions }) {
  const normalizedPassage = normalizeDailyLifePassage(passage);
  const sourceText = normalizedPassage.text || '';

  const explicitEmail = normalizedPassage.type === 'email'
    ? {
      headers: {
        to: normalizedPassage.to,
        from: normalizedPassage.from,
        date: normalizedPassage.date,
        subject: normalizedPassage.subject,
      },
      body: normalizedPassage.body || normalizedPassage.text || '',
    }
    : null;
  const explicitNotice = normalizedPassage.type === 'notice'
    ? {
      title: normalizedPassage.title || '',
      subtitle: normalizedPassage.subtitle || '',
      body: normalizedPassage.body || normalizedPassage.text || '',
    }
    : null;
  const explicitSocial = normalizedPassage.type === 'social'
    ? {
      name: normalizedPassage.name || 'Social User',
      handle: normalizedPassage.handle || '',
      body: normalizedPassage.body || normalizedPassage.text || '',
    }
    : null;

  const emailDocument = explicitEmail || parseEmailPassage(sourceText);
  const socialDocument = !emailDocument ? (explicitSocial || parseSocialPostPassage(sourceText)) : null;
  const noticeDocument = !emailDocument && !socialDocument ? (explicitNotice || parseNoticePassage(sourceText)) : null;
  const genericPassage = sourceText || normalizedPassage.body || '';
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4);
  const heading = emailDocument
    ? 'Read an email.'
    : noticeDocument
      ? 'Read a notice.'
      : socialDocument
        ? 'Read a social media post.'
        : 'Read the text.';

  return (
    <div style={{ height: 'calc(100vh - 96px)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px, 1.6vw, 34px)', fontWeight: 700, color: '#111', margin: '20px 0 8px 0', fontFamily: 'Arial, sans-serif' }}>
        {heading}
      </h2>

      <div className="split-layout" style={{ height: 'calc(100% - 76px)', background: '#fff' }}>
        <div
          className="split-pane split-pane--left"
          style={{
            background: '#fff',
            borderRight: '1px solid #edf2f7',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '24px 24px 24px',
            overflowY: 'auto'
          }}
        >
          {emailDocument ? (
            <EmailDocument headers={emailDocument.headers} body={emailDocument.body} />
          ) : socialDocument ? (
            <SocialPostDocument name={socialDocument.name} handle={socialDocument.handle} body={socialDocument.body} />
          ) : noticeDocument ? (
            <NoticeDocument title={noticeDocument.title} subtitle={noticeDocument.subtitle} body={noticeDocument.body} />
          ) : (
            <GenericDocument passage={genericPassage} />
          )}
        </div>

        <div className="split-pane split-pane--right" style={{ background: '#fff', padding: '24px 80px', overflowY: 'auto' }}>
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
    </div>
  );
}
