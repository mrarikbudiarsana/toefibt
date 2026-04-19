'use client';

export default function RadioOptionList({ options = [], selected, onSelect, gap = 20, fontSize = 16 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {options.slice(0, 4).map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = selected === letter;

        return (
          <button
            key={letter}
            type="button"
            onClick={() => onSelect(letter)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '6px 0',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              color: isSelected ? 'var(--teal)' : '#444',
              fontSize,
              fontWeight: isSelected ? 600 : 400,
              transition: 'all 0.15s ease',
              width: '100%',
              fontFamily: 'var(--font)'
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--teal)' : '#cbd5e1'}`,
                background: isSelected ? 'var(--teal)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
            </span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
