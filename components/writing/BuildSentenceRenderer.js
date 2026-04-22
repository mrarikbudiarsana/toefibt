'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';

/**
 * Build a Sentence  Drag & Drop Word Tiles
 * Student receives scrambled word tiles and drags them to place into the sentence.
 *
 * Props:
 *   prompt: string         speaker 1 text
 *   speaker1PhotoUrl: str  speaker 1 photo
 *   speaker2PhotoUrl: str  speaker 2 photo
 *   options: string[]      options[0] = Text with gaps (e.g. "The [[old city]] [[tour guides]] [[were]] fantastic.")
 *                          options[1] = Distractors (e.g. "was, their, who")
 *   answer: string[]       current ordered answer (array of words)
 *   onAnswer: (orderedTiles: string[]) => void
 */
export default function BuildSentenceRenderer({ prompt, speaker1PhotoUrl, speaker2PhotoUrl, options = [], answer = [], onAnswer, title }) {
  const dragItem = useRef(null);
  const dragSource = useRef(null); // 'pool' | 'arranged'
  const dragIndex = useRef(null);

  // Parse sentence template and extract correct answers
  const sentenceTemplate = options?.[0] || '';
  const distractorsStr = options?.[1] || '';
  
  const templateParts = useMemo(() => {
    if (!sentenceTemplate) return [];
    return sentenceTemplate.split(/\[\[.*?\]\]/);
  }, [sentenceTemplate]);

  const correctWords = useMemo(() => {
    if (!sentenceTemplate) return [];
    const matches = [...sentenceTemplate.matchAll(/\[\[(.*?)\]\]/g)];
    return matches.map(m => m[1].trim());
  }, [sentenceTemplate]);

  // Combine correct words + distractors to form the initial pool
  const initialPool = useMemo(() => {
    const distractors = distractorsStr.split(',').map(d => d.trim()).filter(d => d);
    return [...correctWords, ...distractors];
  }, [correctWords, distractorsStr]);

  // Shuffle initial pool so they appear scrambled to the student
  const [shuffledTiles, setShuffledTiles] = useState([]);
  
  useEffect(() => {
    const arr = [...initialPool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledTiles(arr);
  }, [initialPool]);

  // Ensure we have exact number of slots as correct words
  const slots = useMemo(() => {
    const arr = new Array(correctWords.length).fill(null);
    answer.forEach((word, index) => {
      if (index < arr.length) arr[index] = word;
    });
    return arr;
  }, [correctWords, answer]);

  function handleDragStart(word, source, index) {
    dragItem.current = word;
    dragSource.current = source;
    dragIndex.current = index;
  }

  function handleDropOnSlot(e, dropIndex) {
    e.preventDefault();
    e.stopPropagation();
    const word = dragItem.current;
    const source = dragSource.current;
    if (!word) return;

    let newAnswer = [...answer];

    if (source === 'pool') {
      newAnswer.splice(dropIndex, 0, word);
    } else if (source === 'arranged') {
      const fromIdx = dragIndex.current;
      newAnswer.splice(fromIdx, 1);
      const adjustedDrop = dropIndex > fromIdx ? dropIndex - 1 : dropIndex;
      newAnswer.splice(adjustedDrop, 0, word);
    }

    onAnswer(newAnswer);
    dragItem.current = null;
  }

  function handleDropOnPool(e) {
    e.preventDefault();
    e.stopPropagation();
    const source = dragSource.current;
    if (source === 'arranged') {
      const fromIdx = dragIndex.current;
      const newAnswer = [...answer];
      newAnswer.splice(fromIdx, 1);
      onAnswer(newAnswer);
    }
    dragItem.current = null;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 40px', fontFamily: 'var(--font-sans), sans-serif' }}>
      
      <h2 style={{ 
        textAlign: 'center', 
        fontSize: '28px', 
        fontWeight: '700', 
        color: '#000', 
        marginBottom: '80px',
        letterSpacing: '-0.01em'
      }}>
        {title || "Make an appropriate sentence."}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', marginLeft: '40px' }}>
        
        {/* Speaker 1 (Top) or Question Text */}
        {prompt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {speaker1PhotoUrl && (
              <div style={{
                width: '85px',
                height: '85px',
                borderRadius: '50%',
                border: '2px solid #059669',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6'
              }}>
                <img src={speaker1PhotoUrl} alt="Speaker 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ fontSize: '18px', fontWeight: '500', color: '#000' }}>
              {prompt}
            </div>
          </div>
        )}

        {/* Speaker 2 (Bottom) & Slots */}
        {sentenceTemplate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {speaker2PhotoUrl && (
              <div style={{
                width: '85px',
                height: '85px',
                borderRadius: '50%',
                border: '2px solid #059669',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6'
              }}>
                <img src={speaker2PhotoUrl} alt="Speaker 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            
            <div 
              style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => handleDropOnSlot(e, answer.length)}
            >
              {templateParts.map((part, i) => (
                <React.Fragment key={i}>
                  {part && (
                    <div style={{ fontSize: '18px', color: '#000', paddingBottom: '4px', whiteSpace: 'pre-wrap' }}>
                      {part}
                    </div>
                  )}
                  {i < slots.length && (
                    <div 
                      draggable={!!slots[i]}
                      onDragStart={() => slots[i] && handleDragStart(slots[i], 'arranged', i)}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={e => handleDropOnSlot(e, i)}
                      style={{ 
                        minWidth: '60px', 
                        borderBottom: '1px solid #000', 
                        paddingBottom: '4px', 
                        textAlign: 'center', 
                        fontSize: '18px', 
                        cursor: slots[i] ? 'grab' : 'default',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        color: '#000',
                        backgroundColor: slots[i] ? '#e5e7eb' : 'transparent',
                        borderRadius: slots[i] ? '4px' : '0'
                      }}
                    >
                      {slots[i] || ''}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Word Bank */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '24px', 
          marginTop: '80px', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          paddingLeft: speaker2PhotoUrl || speaker1PhotoUrl ? '110px' : '0px', 
          minHeight: '60px' 
        }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDropOnPool}
      >
         {shuffledTiles.map((word, i) => {
            // Check if this word (at this specific index) is used.
            // Since there can be duplicate words, we need to carefully track uses.
            // For simplicity, we just count occurrences in answer vs initial array.
            // But since words are unique in the drag/drop context typically, we can just do a basic check.
            // A better way is to see if the exact word instance is used. 
            // Let's just track by exact string match for now, assuming words are unique or we remove them sequentially.
            // Wait, answer can contain duplicate words if distractors have duplicates or correct words have duplicates (e.g., "the", "the").
            // We should use an ID for each tile to be perfectly robust.
            // For now, let's keep it simple: count remaining available.
            const totalOfThisWord = initialPool.filter(w => w === word).length;
            const usedOfThisWord = answer.filter(w => w === word).length;
            
            // This specific tile is available if we haven't used up all instances of it.
            // We need to determine if THIS index is used. 
            // A hacky but effective way: find the first N instances in shuffledTiles and mark them used.
            const allIndicesOfWord = [];
            shuffledTiles.forEach((w, idx) => { if (w === word) allIndicesOfWord.push(idx); });
            const myRank = allIndicesOfWord.indexOf(i); // 0, 1, 2...
            
            const isUsed = myRank < usedOfThisWord;

            return (
              <div 
                key={i}
                draggable={!isUsed}
                onDragStart={() => !isUsed && handleDragStart(word, 'pool', i)}
                style={{ 
                   fontSize: '18px', 
                   color: '#000',
                   cursor: isUsed ? 'default' : 'grab', 
                   opacity: isUsed ? 0 : 1, 
                   userSelect: 'none',
                   transition: 'opacity 0.2s ease',
                   padding: '4px 8px',
                   margin: '-4px -8px',
                   backgroundColor: '#e5e7eb',
                   borderRadius: '4px'
                }}
              >
                {word}
              </div>
            );
         })}
      </div>
    </div>
  );
}
