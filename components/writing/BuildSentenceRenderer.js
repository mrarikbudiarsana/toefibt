'use client';
import { useState, useRef } from 'react';

/**
 * Build a Sentence — Drag & Drop Word Tiles
 * Student receives scrambled word tiles and drags them into order.
 *
 * Props:
 *   tiles: string[]       — scrambled words
 *   answer: string[]      — current ordered answer (array of words)
 *   onAnswer: (orderedTiles: string[]) => void
 */
export default function BuildSentenceRenderer({ tiles = [], answer = [], onAnswer, questionNumber, totalQuestions }) {
  const [pool, setPool] = useState(() => {
    // Remove already-placed tiles from pool
    const placed = new Set(answer);
    return tiles.filter(t => !placed.has(t));
  });
  const [arranged, setArranged] = useState(answer);
  const dragItem = useRef(null);
  const dragSource = useRef(null); // 'pool' | 'arranged'
  const dragIndex = useRef(null);

  function handleDragStart(word, source, index) {
    dragItem.current = word;
    dragSource.current = source;
    dragIndex.current = index;
  }

  function handleDropOnArranged(e, dropIndex) {
    e.preventDefault();
    const word = dragItem.current;
    const source = dragSource.current;
    if (!word) return;

    const newArranged = [...arranged];
    const newPool = [...pool];

    if (source === 'pool') {
      // Move from pool to arranged
      const poolIdx = newPool.indexOf(word);
      if (poolIdx !== -1) newPool.splice(poolIdx, 1);
      newArranged.splice(dropIndex, 0, word);
    } else {
      // Reorder within arranged
      const fromIdx = dragIndex.current;
      newArranged.splice(fromIdx, 1);
      const adjustedDrop = dropIndex > fromIdx ? dropIndex - 1 : dropIndex;
      newArranged.splice(adjustedDrop, 0, word);
    }

    setArranged(newArranged);
    setPool(newPool);
    onAnswer(newArranged);
    dragItem.current = null;
  }

  function handleDropOnPool(e) {
    e.preventDefault();
    const word = dragItem.current;
    const source = dragSource.current;
    if (!word || source === 'pool') return;

    // Return tile to pool
    const fromIdx = dragIndex.current;
    const newArranged = [...arranged];
    newArranged.splice(fromIdx, 1);
    setArranged(newArranged);
    setPool(p => [...p, word]);
    onAnswer(newArranged);
    dragItem.current = null;
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 32px' }}>
      <div className="split-pane__label" style={{ marginBottom: 16 }}>
        Question {questionNumber} of {totalQuestions}
      </div>

      <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong>Directions:</strong> Drag the words below to arrange them into a grammatically correct sentence.
      </div>

      {/* Answer area */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
        Your sentence:
      </div>
      <div
        className={`tile-area ${arranged.length === 0 ? '' : ''}`}
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDropOnArranged(e, arranged.length)}
        style={{ minHeight: 60, marginBottom: 24 }}
      >
        {arranged.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Drag words here to build your sentence…</span>
        )}
        {arranged.map((word, i) => (
          <div
            key={`arranged-${i}-${word}`}
            className="tile"
            draggable
            onDragStart={() => handleDragStart(word, 'arranged', i)}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => handleDropOnArranged(e, i)}
          >
            {word}
          </div>
        ))}
      </div>

      {/* Word pool */}
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
        Available words:
      </div>
      <div
        className="tile-area"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropOnPool}
      >
        {pool.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>All words placed ✓</span>
        )}
        {pool.map((word, i) => (
          <div
            key={`pool-${i}-${word}`}
            className="tile"
            draggable
            onDragStart={() => handleDragStart(word, 'pool', i)}
          >
            {word}
          </div>
        ))}
      </div>

      {arranged.length > 0 && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--teal-light)', borderRadius: 8, fontSize: 14, color: 'var(--teal-dark)' }}>
          <strong>Your answer:</strong> {arranged.join(' ')}
        </div>
      )}
    </div>
  );
}
