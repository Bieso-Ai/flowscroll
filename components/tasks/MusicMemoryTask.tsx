import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playNote, playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

const PAD_COLORS = [
    'bg-red-500',
    'bg-blue-500',
    'bg-yellow-400',
    'bg-green-500'
];

const PAD_ACTIVE_COLORS = [
    'bg-red-300 shadow-[0_0_30px_rgba(239,68,68,0.8)]',
    'bg-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.8)]',
    'bg-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.8)]',
    'bg-green-300 shadow-[0_0_30px_rgba(34,197,94,0.8)]'
];

export const MusicMemoryTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'playing' | 'input' | 'success' | 'fail'>('idle');
  const [activePad, setActivePad] = useState<number | null>(null);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  
  const sequence = task.content.sequence as number[];
  const speed = task.content.playbackSpeed as number;
  // IMPORTANT: Default to 2 for Level 1 consistency if undefined
  const activePadsCount = task.content.activePads || 2;

  // Reset on active change
  useEffect(() => {
    if (!isActive) {
        setStatus('idle');
        setActivePad(null);
        setUserSequence([]);
    }
  }, [isActive]);

  const startSequence = () => {
    if (status === 'playing' || status === 'input') return;
    
    setStatus('playing');
    setUserSequence([]);
    
    // Play sequence with delays
    sequence.forEach((noteIndex, i) => {
        setTimeout(() => {
            if (!isActive) return;
            flashPad(noteIndex);
        }, i * speed);
    });

    // Set to input mode after sequence finishes
    setTimeout(() => {
        if (!isActive) return;
        setStatus('input');
    }, sequence.length * speed + 200);
  };

  const flashPad = (index: number) => {
    setActivePad(index);
    playNote(index);
    setTimeout(() => setActivePad(null), speed * 0.6); // Flash duration
  };

  const handlePadClick = (index: number) => {
    if (status !== 'input') return;

    // User feedback
    flashPad(index);

    const expectedNote = sequence[userSequence.length];
    
    if (index !== expectedNote) {
        setStatus('fail');
        playSound('wrong');
        // Allow retry after delay
        setTimeout(() => {
            if (!isActive) return;
            setStatus('idle');
            setUserSequence([]);
        }, 1500);
        return;
    }

    const newUserSeq = [...userSequence, index];
    setUserSequence(newUserSeq);

    if (newUserSeq.length === sequence.length) {
        setStatus('success');
        playSound('correct');
        setTimeout(() => {
            if (!isActive) return;
            onComplete(true);
        }, 1000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-purple-300 mb-2 tracking-widest uppercase">Klang Gedächtnis</h2>
        
        <div className="h-12 mb-6 flex items-center justify-center">
             {status === 'idle' && <p className="text-white animate-pulse">Start drücken</p>}
             {status === 'playing' && <p className="text-yellow-300 font-bold">Zuhören...</p>}
             {status === 'input' && <p className="text-green-400 font-bold">Du bist dran!</p>}
             {status === 'fail' && <p className="text-red-500 font-bold animate-shake">Falsche Note!</p>}
             {status === 'success' && <p className="text-green-400 font-bold scale-125 transition-transform">Richtig!</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
            {PAD_COLORS.map((colorClass, idx) => {
                // Hide pads if they are outside the active count
                const isVisible = idx < activePadsCount;
                
                return (
                    <button
                        key={idx}
                        onClick={() => handlePadClick(idx)}
                        disabled={status === 'playing' || status === 'idle' || !isVisible}
                        className={`
                            w-32 h-32 md:w-40 md:h-40 rounded-2xl transition-all duration-100
                            ${activePad === idx ? PAD_ACTIVE_COLORS[idx] : colorClass}
                            ${!isVisible ? 'opacity-0 pointer-events-none' : ''}
                            ${(status === 'playing' || status === 'idle') ? 'opacity-80 cursor-default' : 'opacity-100 hover:scale-105 active:scale-95 cursor-pointer'}
                        `}
                    />
                );
            })}
        </div>

        {status === 'idle' || status === 'fail' ? (
            <button 
                onClick={startSequence}
                className="px-8 py-3 bg-white/20 hover:bg-white/30 rounded-full text-lg font-bold text-white transition-all backdrop-blur-md"
            >
                {status === 'fail' ? 'Nochmal' : 'Start'}
            </button>
        ) : (
            <div className="h-14" /> // Spacer
        )}
    </div>
  );
};