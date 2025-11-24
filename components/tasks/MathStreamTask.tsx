
import React, { useState, useEffect, useRef } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
  isPaused?: boolean;
}

export const MathStreamTask: React.FC<Props> = ({ task, onComplete, isActive, isPaused = false }) => {
  // Configuration State
  const [speed, setSpeed] = useState(task.content.defaultSpeed); // ms delay
  const [selectedOps, setSelectedOps] = useState<string[]>(task.content.defaultOps || ['+', '-']);
  const [isAlgorithmMode, setIsAlgorithmMode] = useState(true);

  // Game State
  const [status, setStatus] = useState<'setup' | 'playing' | 'answering' | 'success' | 'fail'>('setup');
  const [currentDisplay, setCurrentDisplay] = useState<string>(task.content.startValue.toString());
  const [runningTotal, setRunningTotal] = useState<number>(task.content.startValue);
  const [opsCount, setOpsCount] = useState(0);
  const [input, setInput] = useState('');

  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
        setStatus('setup');
        clearIntervalIfActive();
        setInput('');
    }
  }, [isActive]);

  // Handle Pause/Resume for the Interval Loop
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (status === 'playing') {
        if (isPaused) {
            clearIntervalIfActive();
        } else {
            // Resume loop if we were playing
            startIntervalLoop();
        }
    }
  }, [isPaused, status]); // Re-evaluate when paused changes

  const clearIntervalIfActive = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // --- Logic ---

  const toggleOp = (op: string) => {
    setIsAlgorithmMode(false);
    if (selectedOps.includes(op)) {
        if (selectedOps.length > 1) setSelectedOps(prev => prev.filter(o => o !== op));
    } else {
        setSelectedOps(prev => [...prev, op]);
    }
  };

  const handleAlgorithmToggle = () => {
    if (!isAlgorithmMode) {
        setIsAlgorithmMode(true);
        setSpeed(task.content.defaultSpeed);
        setSelectedOps(task.content.defaultOps);
    }
  };

  const generateNextOp = (current: number) => {
    const op = selectedOps[Math.floor(Math.random() * selectedOps.length)];
    let val = 0;

    switch(op) {
        case '+':
            val = Math.floor(Math.random() * 9) + 1;
            return { op, val, result: current + val };
        case '-':
            val = Math.floor(Math.random() * 9) + 1;
            return { op, val, result: current - val };
        case '*':
            val = Math.floor(Math.random() * 3) + 2; 
            return { op: '×', val, result: current * val };
        case '/':
            const divisors = [];
            for(let i=2; i<=9; i++) {
                if (current % i === 0) divisors.push(i);
            }
            if (divisors.length > 0) {
                val = divisors[Math.floor(Math.random() * divisors.length)];
                return { op: '÷', val, result: current / val };
            } else {
                val = Math.floor(Math.random() * 5) + 1;
                return { op: '+', val, result: current + val };
            }
        default:
            return { op: '+', val: 0, result: current };
    }
  };

  const startIntervalLoop = () => {
      clearIntervalIfActive();
      intervalRef.current = setInterval(() => {
            if (isPausedRef.current) return; // Double safety
            
            setRunningTotal(prev => {
                const { op, val, result } = generateNextOp(prev);
                setCurrentDisplay(`${op} ${val}`);
                playSound('beat'); 
                setOpsCount(c => c + 1);
                return result;
            });
      }, speed);
  };

  const startGame = () => {
    setStatus('playing');
    setRunningTotal(task.content.startValue);
    setCurrentDisplay(task.content.startValue.toString());
    setOpsCount(0);
    playSound('tap');

    setTimeout(() => {
        if (!isActiveRef.current || isPausedRef.current) return;
        startIntervalLoop();
    }, 1000);
  };

  const stopGame = () => {
    clearIntervalIfActive();
    setStatus('answering');
  };

  // Numpad handlers
  const handleNumClick = (num: string) => {
      if (input.length < 10) {
          setInput(prev => prev + num);
          playSound('tap');
      }
  };
  
  const handleDelete = () => {
      setInput(prev => prev.slice(0, -1));
      playSound('tap');
  };
  
  const handleNegative = () => {
      setInput(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
      playSound('tap');
  };

  const submitAnswer = () => {
    const val = parseInt(input);
    if (val === runningTotal) {
        setStatus('success');
        playSound('correct');
        setTimeout(() => onComplete(true), 1000);
    } else {
        setStatus('fail');
        playSound('wrong');
        setTimeout(() => {
            if (isActiveRef.current) {
                setStatus('setup');
                setInput('');
            }
        }, 1500);
    }
  };

  // --- UI Components ---

  if (status === 'setup') {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 space-y-8">
            <h2 className="text-3xl font-bold text-cyan-400 uppercase tracking-widest">Mathe Fluss</h2>
            
            <div className="relative w-48 h-24 overflow-hidden">
                <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-gray-700 border-b-transparent border-r-transparent transform -rotate-45"></div>
                <div 
                    className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-cyan-500 border-b-transparent border-r-transparent transform transition-transform duration-300"
                    style={{ transform: `rotate(${-45 + ((3000 - speed) / 2500) * 180}deg)` }}
                ></div>
                <div className="absolute bottom-0 w-full text-center text-white font-bold text-xl">
                    {Math.round(3000 - speed)} Speed
                </div>
            </div>
            
            <div className="w-full max-w-xs space-y-4">
                <div>
                    <label className="text-white/60 text-xs uppercase font-bold">Geschwindigkeit</label>
                    <input 
                        type="range" 
                        min="500" max="2500" step="100"
                        value={speed}
                        onChange={(e) => { setSpeed(Number(e.target.value)); setIsAlgorithmMode(false); }}
                        className="w-full accent-cyan-500"
                        style={{ direction: 'rtl' }} 
                    />
                </div>

                <div>
                    <label className="text-white/60 text-xs uppercase font-bold mb-2 block">Rechenarten</label>
                    <div className="flex justify-center gap-3">
                        {['+', '-', '*', '/'].map(op => (
                            <button 
                                key={op}
                                onClick={() => toggleOp(op)}
                                className={`w-10 h-10 rounded-full font-bold text-lg flex items-center justify-center transition-all ${
                                    selectedOps.includes(op) ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-white'
                                }`}
                            >
                                {op === '*' ? '×' : op === '/' ? '÷' : op}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleAlgorithmToggle}
                    className={`w-full py-2 rounded-lg text-sm font-bold border border-cyan-500/30 transition-colors ${
                        isAlgorithmMode ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-500'
                    }`}
                >
                    {isAlgorithmMode ? "Algorithmus: AN" : "Algorithmus: Manuell"}
                </button>
            </div>

            <button 
                onClick={startGame}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 active:scale-95 transition-transform"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
  }

  if (status === 'playing') {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center relative bg-black">
             {/* PAUSED OVERLAY */}
             {isPaused && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
                    <p className="text-2xl font-bold text-white animate-pulse">PAUSIERT</p>
                </div>
             )}

             <div className="text-7xl md:text-9xl font-black text-white font-mono z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                {currentDisplay}
             </div>

             <button 
                onClick={stopGame}
                disabled={isPaused}
                className="absolute bottom-24 w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
             >
                <div className="w-8 h-8 bg-white rounded-sm" />
             </button>

             <div className="absolute top-12 right-8 text-white/30 font-mono">
                Streak: {opsCount}
             </div>
        </div>
      );
  }

  return (
    <div 
        className="h-full w-full flex flex-col items-center justify-between px-2 pt-8"
        style={{ paddingBottom: 'calc(var(--footer-height, 80px) + 2rem)' }}
    >
        <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="mb-8 text-center">
                <h2 className="text-xl font-bold text-white/60 mb-2 uppercase tracking-widest">Ergebnis?</h2>
            </div>
            
            <div 
                className={`
                    w-full max-w-md h-24 bg-black/20 backdrop-blur-md border-2 rounded-3xl 
                    flex items-center justify-center text-6xl font-mono font-bold text-white shadow-inner transition-all duration-300
                    ${status === 'success' ? 'border-green-500 text-green-400' : 
                    status === 'fail' ? 'border-red-500 text-red-400' : 'border-cyan-500/50'}
                `}
            >
                {input}
                <span className="animate-pulse text-white/30">|</span>
            </div>
            
             {status === 'fail' && (
                <div className="mt-4 text-center">
                    <p className="text-red-400 font-bold text-xl">Falsch. Es war {runningTotal}</p>
                </div>
            )}
        </div>

        {/* Custom Numpad for Stream Task */}
        <div className="w-full max-w-md grid grid-cols-3 gap-2 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                    key={num}
                    onClick={() => handleNumClick(num.toString())}
                    className="h-16 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-3xl font-bold text-white hover:bg-white/20 active:scale-95 active:bg-white/30 transition-all shadow-lg"
                >
                    {num}
                </button>
            ))}
            
            <button
                onClick={handleDelete}
                className="h-16 md:h-20 rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/30 active:scale-95 transition-all flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                </svg>
            </button>

            <button
                onClick={() => handleNumClick('0')}
                className="h-16 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-3xl font-bold text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
            >
                0
            </button>
            
            {/* Submit Button */}
            <button
                onClick={submitAnswer}
                className="h-16 md:h-20 rounded-2xl bg-cyan-500/30 backdrop-blur-md border border-cyan-400/50 text-white hover:bg-cyan-500/50 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-cyan-500/20"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
            </button>

             {/* Negative Toggle (Hidden feature for pros) */}
             <button 
                onClick={handleNegative} 
                className="absolute bottom-2 left-2 text-xs text-white/20 font-mono p-2"
             >
                +/-
             </button>
        </div>
    </div>
  );
};
