import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const MathSequenceTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const { sequence, options, correctValue } = task.content;

  useEffect(() => {
    if (!isActive) {
        setStatus('idle');
        setSelectedOption(null);
    }
  }, [isActive]);

  const handleOptionClick = (val: number) => {
    if (status !== 'idle') return;
    setSelectedOption(val);

    if (val === correctValue) {
        setStatus('success');
        playSound('correct');
        setTimeout(() => {
            if (isActive) onComplete(true);
        }, 800);
    } else {
        setStatus('fail');
        playSound('wrong');
        setTimeout(() => {
            if (isActive) onComplete(false);
        }, 1000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-cyan-300 uppercase tracking-widest mb-2">Muster erkennen</h2>
            <h3 className="text-white/60">Setze die Reihe fort</h3>
        </div>

        {/* The Sequence Display */}
        <div className="flex items-center justify-center gap-3 mb-16 flex-wrap max-w-lg">
            {sequence.map((num: number, i: number) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="text-4xl md:text-5xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                        {num}
                    </div>
                    {/* Divider Arrow/Dot */}
                    <div className="text-white/20 text-2xl">→</div>
                </div>
            ))}
            {/* The Mystery Box */}
            <div className={`
                w-16 h-16 md:w-20 md:h-20 rounded-xl border-4 border-dashed 
                flex items-center justify-center text-3xl font-bold
                ${status === 'success' ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-cyan-500/50 bg-white/5 text-cyan-300'}
            `}>
                {status === 'success' ? correctValue : '?'}
            </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            {options.map((opt: number, idx: number) => {
                let stateStyle = "bg-white/10 border-white/5";
                
                if (status === 'success' && opt === correctValue) {
                    stateStyle = "bg-green-500 border-green-400 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                } else if (status === 'fail' && opt === selectedOption) {
                    stateStyle = "bg-red-500 border-red-400 animate-shake";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        disabled={status !== 'idle'}
                        className={`
                            h-20 rounded-2xl border-2 text-3xl font-mono font-bold text-white transition-all duration-200
                            ${stateStyle}
                            ${status === 'idle' ? 'hover:bg-white/20 active:scale-95' : ''}
                        `}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    </div>
  );
};