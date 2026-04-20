'use client';

/**
 * Write for an Academic Discussion
 * Forum layout: discussion thread on left, editor on right
 * ~100-word minimum response
 *
 * ETS Rubric: 05 (AI scored)
 * Timing: ~10 minutes
 */

const SAMPLE_POSTS = [
  {
    name: 'Professor Rivera',
    avatar: 'IN',
    role: 'Instructor',
    message: 'This week, we are discussing whether universities should require all students to study abroad for at least one semester. What is your opinion on this policy?',
  },
  {
    name: 'Alex M.',
    avatar: 'AM',
    role: 'Student',
    message: 'I think studying abroad should be required. It helps students develop cross-cultural communication skills and broadens their worldview in ways that on-campus learning cannot.',
  },
  {
    name: 'Priya S.',
    avatar: 'SL',
    role: 'Student',
    message: 'I disagree. Not every student can afford to study abroad. Making it mandatory would create an unfair burden on students from lower-income backgrounds.',
  },
];

export default function WriteDiscussionRenderer({ discussionPosts = SAMPLE_POSTS, prompt = '', value = '', onChange, questionNumber, totalQuestions }) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="split-layout">
      {/* Left  discussion thread */}
      <div className="split-pane split-pane--left">
        <div className="split-pane__label">Academic Discussion  Task {questionNumber} of {totalQuestions}</div>

        {/* Discussion posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(discussionPosts.length ? discussionPosts : SAMPLE_POSTS).map((post, i) => (
            <div key={i} style={{
              background: i === 0 ? '#f0f9fa' : '#ffffff',
              borderRadius: 12,
              padding: '16px 20px',
              border: `1px solid ${i === 0 ? '#c7e9eb' : '#edf2f7'}`,
              boxShadow: i === 0 ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{post.avatar}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{post.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{post.role}</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{post.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right  editor */}
      <div className="split-pane split-pane--right" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="split-pane__label" style={{ margin: 0 }}>Your Response</div>
          <span style={{ fontSize: 12, color: wordCount >= 100 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
            {wordCount} / 100+ words
          </span>
        </div>

        {prompt && (
          <div style={{ marginBottom: 12, padding: '14px 18px', background: '#f0f9fa', borderRadius: 10, fontSize: 14, color: '#0d7377', lineHeight: 1.6, border: '1px solid #c7e9eb' }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em', marginBottom: 4 }}>Writing Prompt</div>
            {prompt}
          </div>
        )}

        <textarea
          className="input"
          style={{ flex: 1, minHeight: 350, fontFamily: 'var(--font)', fontSize: 15, lineHeight: 1.7, resize: 'none' }}
          placeholder="Write your response to the discussion here. Express your opinion and support it with examples or reasons"
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={true}
        />

      </div>
    </div>
  );
}

