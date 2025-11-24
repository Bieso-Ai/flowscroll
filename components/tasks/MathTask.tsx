
import React, { useState } from 'react';
import { TaskData, TaskType } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const MathTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const handleNumClick = (num: string) => {
    if (status !== 'idle') return;
    if (input.length < 8) {
        setInput(prev => prev + num);
        playSound('tap');
    }
  };

  const handleDelete = () => {
    if (status !== 'idle') return;
    setInput(prev => prev.slice(0, -1));
    playSound('tap');
  };

  const handleSubmit = () => {
    if (status !== 'idle' || !input) return;

    const val = parseInt(input);
    if (val === task.solution) {
      setStatus('correct');
      playSound('correct');
      setTimeout(() => onComplete(true), 1000);
    } else {
      setStatus('wrong');
      playSound('wrong');
      setInput('');
      setTimeout(() => setStatus('idle'), 500);
    }
  };

  // --- LAYOUT LOGIC ---
  const { a, b } = task.content || {};
  
  // Use vertical layout if numbers exist and are >= 3 digits
  const isColumnMode = (a !== undefined && b !== undefined) && (a.toString().length >= 3 || b.toString().length >= 3);

  let opSymbol = '+';
  if (task.type === TaskType.MATH_SUBTRACTION) opSymbol = '-';
  else if (task.type === TaskType.MATH_MULTIPLICATION) opSymbol = '×';

  // --- DYNAMIC FONT SIZING ---
  const getQuestionFontSize = (text: string) => {
      const len = text.length;
      if (len > 12) return "text-3xl sm:text-5xl md:text-6xl"; // Very long
      if (len > 8) return "text-4xl sm:text-6xl md:text-7xl";  // Medium
      return "text-5xl sm:text-7xl md:text-9xl"; // Short (e.g. 5 + 5)
  };
  const fontSizeClass = getQuestionFontSize(task.question);

  return (
    <div 
        className="flex flex-col items-center justify-between h-full w-full px-2 pt-4 md:pt-8 md:pb-24"
        style={{ paddingBottom: 'calc(var(--footer-height, 80px) + 2rem)' }}
    >
      
      {/* Top Section: Question Area */}
      {/* min-h-0 and flex-1 allows this section to shrink if screen is very short */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-full overflow-hidden min-h-0">
        
        {isColumnMode ? (
            // --- VERTICAL COLUMN LAYOUT ---
            // Added horizontal padding logic and reduced font sizes for mobile
            <div className="mb-4 md:mb-8 flex flex-col items-end relative font-mono font-black text-white mr-8 md:mr-12 pl-8">
                 {/* Top Number */}
                 <div className="text-5xl sm:text-7xl md:text-8xl leading-none mb-2 tracking-wider">{a}</div>
                 
                 {/* Bottom Row: Operator + Number */}
                 <div className="flex items-center justify-end w-full relative">
                    {/* Floating Operator */}
                    <div className="absolute right-[100%] mr-2 md:mr-4 text-2xl md:text-4xl text-cyan-400 bg-white/10 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                        {opSymbol}
                    </div>
                    
                    {/* Bottom Number */}
                    <div className="text-5xl sm:text-7xl md:text-8xl leading-none tracking-wider">{b}</div>
                 </div>

                 {/* Divider Line */}
                 <div className="w-[120%] h-1 md:h-2 bg-white/50 rounded-full mt-2 md:mt-4 -mr-4" />
            </div>
        ) : (
            // --- STANDARD HORIZONTAL LAYOUT ---
            <div className="mb-4 md:mb-8 text-center w-full px-4">
                <h2 className="text-xs md:text-base font-bold text-white/60 mb-2 uppercase tracking-widest">{task.type.replace('MATH_', '')}</h2>
                <div className={`${fontSizeClass} font-black text-white drop-shadow-lg font-mono leading-tight break-all sm:break-words transition-all duration-300`}>
                    {task.question}
                </div>
            </div>
        )}

        {/* Input Display */}
        <div 
            className={`
                w-full max-w-md h-16 md:h-24 bg-black/20 backdrop-blur-md border-2 rounded-2xl md:rounded-3xl 
                flex items-center justify-center font-mono font-bold text-white shadow-inner transition-all duration-300
                ${input.length > 5 ? 'text-3xl md:text-4xl' : 'text-5xl md:text-6xl'} 
                ${status === 'correct' ? 'border-green-500 text-green-400' : 
                  status === 'wrong' ? 'border-red-500 text-red-400' : 'border-white/20'}
            `}
        >
            {input}
            {status === 'idle' && <span className="animate-pulse text-white/30">|</span>}
        </div>
      </div>

      {/* Bottom Section: Numpad */}
      {/* Reduced gap and height for smaller screens */}
      <div className="w-full max-w-md grid grid-cols-3 gap-2 md:gap-4 p-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
                key={num}
                onClick={() => handleNumClick(num.toString())}
                className="h-14 sm:h-16 md:h-20 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-2xl md:text-3xl font-bold text-white hover:bg-white/20 active:scale-95 active:bg-white/30 transition-all shadow-lg"
            >
                {num}
            </button>
        ))}
        
        <button
            onClick={handleDelete}
            className="h-14 sm:h-16 md:h-20 rounded-xl md:rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/30 active:scale-95 transition-all flex items-center justify-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
            </svg>
        </button>

        <button
            onClick={() => handleNumClick('0')}
            className="h-14 sm:h-16 md:h-20 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-2xl md:text-3xl font-bold text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
        >
            0
        </button>

        <button
            onClick={handleSubmit}
            className="h-14 sm:h-16 md:h-20 rounded-xl md:rounded-2xl bg-blue-500/30 backdrop-blur-md border border-blue-400/50 text-white hover:bg-blue-500/50 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-blue-500/20"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
        </button>
      </div>

    </div>
  );
};
