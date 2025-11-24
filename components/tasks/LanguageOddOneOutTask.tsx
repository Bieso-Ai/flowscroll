import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const LanguageOddOneOutTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { options, oddIndex } = task.content;

  useEffect(() => {
    if (!isActive) {
        setStatus('idle');
        setSelectedIndex(null);
    }
  }, [isActive]);

  const handleOptionTap = (index: number) => {
    if (status !== 'idle') return;
    setSelectedIndex(index);

    if (index === oddIndex) {
        setStatus('success');
        playSound('correct');
        setTimeout(() => {
            if (isActive) onComplete(true);
        }, 800);
    } else {
        setStatus('fail');
        playSound('wrong');
        // Allow quick retry or fail? Typically fail ends the task in flow apps, but here we might want feedback.
        // Following current app logic: fail state usually waits then resets or completes false.
        // We will complete false after a delay to maintain flow.
        setTimeout(() => {
            if (isActive) onComplete(false);
        }, 1000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-purple-300 uppercase tracking-widest mb-2">Logik</h2>
            <h3 className="text-3xl font-black text-white">Welches Wort passt nicht?</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
            {options.map((word: string, idx: number) => {
                let stateStyle = "bg-white/10 border-white/5";
                
                if (status === 'success' && idx === oddIndex) {
                    stateStyle = "bg-green-500 border-green-400 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                } else if (status === 'fail' && idx === selectedIndex) {
                    stateStyle = "bg-red-500 border-red-400 animate-shake";
                } else if (status === 'fail' && idx === oddIndex) {
                    // Show correct answer when failed
                    stateStyle = "bg-green-500/50 border-green-400/50 opacity-50";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleOptionTap(idx)}
                        disabled={status !== 'idle'}
                        className={`
                            w-full py-5 px-6 rounded-2xl border-2 text-xl font-bold text-white transition-all duration-200
                            ${stateStyle}
                            ${status === 'idle' ? 'hover:bg-white/20 active:scale-95' : ''}
                        `}
                    >
                        {word}
                    </button>
                );
            })}
        </div>
    </div>
  );
};