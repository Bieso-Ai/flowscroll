import React, { useState, useEffect } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const LanguageConnectTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { mode, target, options, correctIndex } = task.content;

  useEffect(() => {
    if (!isActive) {
        setStatus('idle');
        setSelectedIndex(null);
    }
  }, [isActive]);

  const handleOptionTap = (index: number) => {
    if (status !== 'idle') return;
    setSelectedIndex(index);

    if (index === correctIndex) {
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

  // Label translation
  const instruction = mode === 'synonym' ? "Wähle das Synonym" : "Wähle das Gegenteil";
  const symbol = mode === 'synonym' ? "=" : "≠";

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6">
        {/* Top Section: Target Word */}
        <div className="mb-10 text-center flex flex-col items-center">
            <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-widest mb-4 bg-cyan-900/30 px-3 py-1 rounded-full">
                {instruction}
            </h2>
            
            <div className="relative">
                <div className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {target}
                </div>
                <div className="absolute -right-8 top-0 text-white/20 font-mono text-4xl font-bold">
                    {symbol}
                </div>
            </div>
            
            <div className="mt-2 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Bottom Section: Options Grid */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
            {options.map((word: string, idx: number) => {
                let stateStyle = "bg-white/5 border-white/10";
                let textStyle = "text-white";

                if (status === 'success' && idx === correctIndex) {
                    stateStyle = "bg-green-500 border-green-400 scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)]";
                    textStyle = "text-white font-black";
                } else if (status === 'fail' && idx === selectedIndex) {
                    stateStyle = "bg-red-500 border-red-400 animate-shake";
                } else if (status === 'fail' && idx === correctIndex) {
                    stateStyle = "bg-green-500/30 border-green-400/30 opacity-60";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleOptionTap(idx)}
                        disabled={status !== 'idle'}
                        className={`
                            w-full py-4 px-6 rounded-2xl border-2 text-xl font-bold transition-all duration-200
                            ${stateStyle} ${textStyle}
                            ${status === 'idle' ? 'hover:bg-white/10 active:scale-95' : ''}
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