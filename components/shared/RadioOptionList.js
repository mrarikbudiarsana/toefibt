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
              gap: 14,
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              color: isSelected ? '#111' : '#475569',
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
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: `1.5px solid ${isSelected ? 'var(--teal)' : '#cbd5e1'}`,
                background: isSelected ? 'var(--teal)' : '#fcfcff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? '0 0 0 4px var(--teal-light)' : 'none'
              }}
            >
              {isSelected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />}
            </span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
