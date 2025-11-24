import React, { useState, useEffect, useRef } from 'react';
import { TaskData } from '../../types';
import { playRhythmPattern, playSound, BeatEvent } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const MusicTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [status, setStatus] = useState<'idle' | 'playing' | 'recording' | 'success' | 'fail'>('idle');
  const [taps, setTaps] = useState<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [visualTrigger, setVisualTrigger] = useState<string>(''); // 'kick', 'snare', etc.

  const pattern = task.content.pattern as BeatEvent[];
  const totalDuration = task.content.totalDuration || 2000;
  const totalBeatsNeeded = pattern.length;

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
        setStatus('idle');
        setTaps([]);
        setTapCount(0);
        setVisualTrigger('');
    }
  }, [isActive]);

  const handleListen = () => {
    if (status === 'playing') return;
    
    setStatus('playing');
    setTaps([]);
    setTapCount(0);
    setFeedback('Hör zu...');

    // Play pattern and synchronize visuals
    pattern.forEach(event => {
        setTimeout(() => {
            if (isActiveRef.current) {
                setVisualTrigger(event.type);
                setTimeout(() => { 
                    if (isActiveRef.current) setVisualTrigger(''); 
                }, 100);
            }
        }, event.timeOffset);
    });

    playRhythmPattern(pattern, () => {
        if (!isActiveRef.current) return;
        setStatus('recording');
        setFeedback('Jetzt du!');
    });
  };

  const handleTap = () => {
    if (status !== 'recording') return;

    const now = performance.now();
    
    // --- NEW LOGIC: Play the specific instrument of the current step ---
    // Check which instrument is expected at this step (tapCount)
    const expectedInstrument = pattern[tapCount] ? pattern[tapCount].type : 'beat';
    
    // Play that specific sound (Kick, Snare, etc.) instead of generic beat
    playSound(expectedInstrument as any); 
    
    // Trigger the specific visual for that instrument
    setVisualTrigger(expectedInstrument);
    setTimeout(() => setVisualTrigger(''), 100);
    
    const newTaps = [...taps, now];
    setTaps(newTaps);
    setTapCount(prev => prev + 1);

    if (newTaps.length === totalBeatsNeeded) {
        validateRhythm(newTaps);
    }
  };

  const validateRhythm = (tapTimestamps: number[]) => {
    // Normalize user input: first tap is T=0
    const start = tapTimestamps[0];
    const userIntervals = tapTimestamps.map(t => t - start);
    
    // Normalize target: first note is T=0
    const targetStart = pattern[0].timeOffset;
    const targetIntervals = pattern.map(p => p.timeOffset - targetStart);

    let totalError = 0;

    for(let i=0; i < Math.min(userIntervals.length, targetIntervals.length); i++) {
        const diff = Math.abs(userIntervals[i] - targetIntervals[i]);
        totalError += diff;
    }

    const avgErrorMs = totalError / userIntervals.length;
    const tolerance = 150; 

    if (avgErrorMs < tolerance) {
        setStatus('success');
        playSound('correct');
        setFeedback('Perfekter Groove!');
        setTimeout(() => {
            if (isActiveRef.current) onComplete(true);
        }, 1000);
    } else {
        setStatus('fail');
        playSound('wrong');
        setFeedback(avgErrorMs > 300 ? 'Daneben!' : 'Etwas ungenau...');
        setTimeout(() => {
            if (isActiveRef.current) {
                setStatus('idle');
                setFeedback('Nochmal');
                setTaps([]);
                setTapCount(0);
            }
        }, 1500);
    }
  };

  // Dynamic styles based on what drum is playing
  let buttonStyle = "border-pink-400 bg-pink-900/30";

  if (visualTrigger === 'kick') buttonStyle = "border-red-500 bg-red-500 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.8)]";
  else if (visualTrigger === 'snare') buttonStyle = "border-white bg-white scale-105 shadow-[0_0_50px_rgba(255,255,255,0.8)]";
  else if (visualTrigger === 'hihat') buttonStyle = "border-cyan-400 bg-cyan-900 scale-100";
  else if (visualTrigger === 'tom') buttonStyle = "border-yellow-500 bg-yellow-600 scale-105";
  else if (visualTrigger === 'tap') buttonStyle = "border-green-400 bg-green-500/50 scale-95";

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-pink-400 mb-2 tracking-widest uppercase">Rhythmus</h2>
        <h3 className="text-white text-lg mb-8 opacity-80">Hör zu, dann wiederhole den Beat</h3>

        <div className="relative w-full max-w-xs aspect-square flex items-center justify-center">
            
            {status === 'idle' || status === 'fail' ? (
                 <button 
                    onClick={handleListen}
                    className="w-32 h-32 rounded-full bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-500/50 flex items-center justify-center transition-all active:scale-95"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                 </button>
            ) : (
                <button 
                    onClick={handleTap}
                    disabled={status !== 'recording'}
                    className={`w-56 h-56 rounded-full border-4 transition-all duration-75 flex flex-col items-center justify-center
                        ${buttonStyle}
                        ${status === 'recording' ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                >
                    {status === 'success' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-16 h-16 text-green-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    ) : (
                        <div className="text-white text-xl font-mono font-bold pointer-events-none select-none">
                            {visualTrigger ? visualTrigger.toUpperCase() : (status === 'playing' ? '...' : 'TAP!')}
                        </div>
                    )}
                    
                    {status === 'recording' && (
                         <div className="mt-4 flex gap-1 absolute -bottom-12">
                            {Array.from({ length: totalBeatsNeeded }).map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < tapCount ? 'bg-pink-500' : 'bg-gray-700'}`} />
                            ))}
                         </div>
                    )}
                </button>
            )}
        </div>

        <div className="h-12 mt-16 flex items-center justify-center">
            <p className={`text-xl font-bold transition-all ${
                status === 'fail' ? 'text-red-400 animate-shake' : 
                status === 'success' ? 'text-green-400 scale-110' : 'text-white'
            }`}>
                {feedback}
            </p>
        </div>
    </div>
  );
};