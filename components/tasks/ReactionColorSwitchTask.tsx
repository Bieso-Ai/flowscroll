import React, { useState, useEffect, useRef } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

interface TrialLog {
    trialIndex: number;
    wasHit: boolean;
    reactionTime?: number;
    falseAlarm: boolean;
}

export const ReactionColorSwitchTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [phase, setPhase] = useState<'intro' | 'countdown' | 'playing' | 'summary'>('intro');
  const [countdown, setCountdown] = useState(3);
  
  // Task Config
  const { numTrials, distractorStepMin, distractorStepMax, colorChangeSpeed, targetWindow, distractors, targetColorClass, targetColorName } = task.content;

  // Game State
  const [trialPhase, setTrialPhase] = useState<'neutral' | 'distractor' | 'target' | 'feedback'>('neutral');
  const [currentColor, setCurrentColor] = useState('bg-gray-700');
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  
  // Stats
  const [logs, setLogs] = useState<TrialLog[]>([]);
  const [sessionStats, setSessionStats] = useState({ hits: 0, misses: 0, falseAlarms: 0, avgRt: 0, score: 0 });

  // Refs for timing
  const isActiveRef = useRef(isActive);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetAppearTimeRef = useRef<number>(0);
  const distractorCountRef = useRef(0);
  const targetDistractorStepsRef = useRef(0);
  const hasInteractedInTrialRef = useRef(false);
  // Safety lock for countdown/intro transitions
  const inputLocked = useRef(false);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setPhase('intro');
    }
  }, [isActive]);

  const startCountdown = () => {
      setPhase('countdown');
      setCountdown(3);
      inputLocked.current = true;

      let count = 3;
      const interval = setInterval(() => {
          count--;
          if (count > 0) {
              setCountdown(count);
              playSound('tap');
          } else {
              clearInterval(interval);
              setCountdown(0);
              startSession();
          }
      }, 800);
  };

  const startSession = () => {
    setPhase('playing');
    inputLocked.current = false;
    setCurrentTrialIndex(0);
    setLogs([]);
    startTrial();
  };

  const startTrial = () => {
      // Reset Trial State
      setTrialPhase('neutral');
      setCurrentColor('bg-gray-700');
      setFeedbackMsg('');
      hasInteractedInTrialRef.current = false;
      distractorCountRef.current = 0;
      
      // Decide how many distractors for this trial
      targetDistractorStepsRef.current = Math.floor(Math.random() * (distractorStepMax - distractorStepMin + 1)) + distractorStepMin;

      // Wait briefly then start distractors
      timeoutRef.current = setTimeout(() => {
          if (!isActiveRef.current) return;
          stepDistractor();
      }, 1000);
  };

  const stepDistractor = () => {
      if (!isActiveRef.current) return;
      
      // Check if we reached target step
      if (distractorCountRef.current >= targetDistractorStepsRef.current) {
          showTarget();
          return;
      }

      // Show Distractor
      setTrialPhase('distractor');
      
      // Pick random distractor color that isn't the same as previous (if possible)
      let nextColor = distractors[Math.floor(Math.random() * distractors.length)];
      setCurrentColor(nextColor);
      playSound('beat');
      
      distractorCountRef.current++;

      timeoutRef.current = setTimeout(() => {
          if (!isActiveRef.current) return;
          stepDistractor();
      }, colorChangeSpeed);
  };

  const showTarget = () => {
      if (!isActiveRef.current) return;
      
      setTrialPhase('target');
      setCurrentColor(targetColorClass);
      playSound('beat'); // Sound on target appearance too for consistent rhythm
      targetAppearTimeRef.current = Date.now();
      
      // Schedule Miss
      timeoutRef.current = setTimeout(() => {
          if (!isActiveRef.current) return;
          handleMiss();
      }, targetWindow);
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
      // IMPORTANT: Stop propagation so the Feed doesn't swipe when tapping the button
      e.stopPropagation();
      // Prevent default to avoid double-firing on some touch devices
      if (e.cancelable && e.type !== 'click') e.preventDefault(); 

      if (phase !== 'playing' || inputLocked.current) return;
      
      if (hasInteractedInTrialRef.current) return; // Ignore multi-taps per trial
      hasInteractedInTrialRef.current = true;

      if (trialPhase === 'target') {
          // HIT
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          const rt = Date.now() - targetAppearTimeRef.current;
          playSound('tap');
          
          setFeedbackMsg(`${rt}ms`);
          setFeedbackColor('text-green-400');
          
          logTrial(true, rt, false);
          
          timeoutRef.current = setTimeout(nextTrialOrFinish, 800);

      } else {
          // FALSE ALARM (Neutral or Distractor)
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          playSound('wrong');
          
          setFeedbackMsg("Zu früh!");
          setFeedbackColor('text-orange-400');
          
          logTrial(false, undefined, true);
          
          timeoutRef.current = setTimeout(nextTrialOrFinish, 1000);
      }
  };

  const handleMiss = () => {
      hasInteractedInTrialRef.current = true;
      playSound('wrong');
      
      setFeedbackMsg("Zu langsam");
      setFeedbackColor('text-red-400');
      
      logTrial(false, undefined, false); // Miss, not False Alarm
      
      timeoutRef.current = setTimeout(nextTrialOrFinish, 1000);
  };

  const logTrial = (wasHit: boolean, rt?: number, falseAlarm: boolean = false) => {
      setLogs(prev => [...prev, {
          trialIndex: currentTrialIndex,
          wasHit,
          reactionTime: rt,
          falseAlarm
      }]);
  };

  const nextTrialOrFinish = () => {
      if (currentTrialIndex >= numTrials - 1) {
          finishSession();
      } else {
          setCurrentTrialIndex(prev => prev + 1);
          startTrial();
      }
  };

  const finishSession = () => {
      const hits = logs.filter(l => l.wasHit).length;
      const falseAlarms = logs.filter(l => l.falseAlarm).length;
      const misses = numTrials - hits - falseAlarms; // Rough calc, logs length = numTrials normally
      
      const rts = logs.filter(l => l.wasHit && l.reactionTime).map(l => l.reactionTime!);
      const avgRt = rts.length > 0 ? Math.round(rts.reduce((a,b) => a+b, 0) / rts.length) : 0;

      // Score: Base 100. -5 per miss, -5 per false alarm. Bonus for speed (< 500ms).
      let score = 100 - (misses * 5) - (falseAlarms * 5);
      if (avgRt > 0 && avgRt < 500) score += Math.round((500 - avgRt) / 10);
      score = Math.max(0, Math.min(100, score));

      setSessionStats({ hits, misses, falseAlarms, avgRt, score });
      setPhase('summary');
      playSound('correct');
  };

  // --- RENDER ---

  if (phase === 'intro') {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-black text-center relative overflow-hidden">
             {/* Dynamic background blobles */}
             <div className="absolute top-10 -left-10 w-48 h-48 bg-purple-600 rounded-full blur-[80px] opacity-40 animate-pulse" />
             <div className="absolute bottom-10 -right-10 w-48 h-48 bg-blue-600 rounded-full blur-[80px] opacity-40 animate-pulse" />

             <div className="z-10 flex flex-col items-center">
                 <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">Farben Wechsel</h2>
                 
                 <div className="w-full max-w-xs bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-8">
                     <p className="text-lg text-white font-medium mb-4">
                        Warte bis der Button
                     </p>
                     <div className={`w-full py-3 rounded-lg ${targetColorClass} text-black font-bold text-xl uppercase shadow-lg shadow-green-500/30`}>
                        {targetColorName}
                     </div>
                     <p className="mt-4 text-sm text-white/50">
                        wird. Ignoriere andere Farben.
                     </p>
                 </div>

                 <button 
                    onClick={startCountdown}
                    className="px-10 py-4 bg-white text-black font-bold rounded-full text-xl shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-transform"
                 >
                    Start
                 </button>
             </div>
        </div>
      );
  }

  if (phase === 'countdown') {
      return (
          <div className="h-full w-full flex flex-col items-center justify-center bg-black">
              <div className="text-9xl font-black text-white animate-ping">
                  {countdown}
              </div>
          </div>
      );
  }

  if (phase === 'playing') {
      const progress = ((currentTrialIndex + 1) / numTrials) * 100;
      
      return (
        <div 
            className="h-full w-full flex flex-col items-center justify-center relative bg-black touch-none select-none"
        >
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 h-1 bg-white/20 w-full">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            {/* Instruction Reminder */}
            <div className="absolute top-8 text-white/30 font-bold uppercase tracking-widest text-sm">
                Ziel: {targetColorName}
            </div>

            {/* THE BUTTON (Interaction Target) */}
            {/* Moved handlers HERE to prevent feed swipe conflicts */}
            <div className="relative">
                <div 
                    onMouseDown={handleInteraction}
                    onTouchStart={handleInteraction}
                    className={`
                        w-64 h-64 rounded-full shadow-2xl transition-colors duration-75 cursor-pointer
                        ${currentColor}
                        ${trialPhase === 'target' ? 'scale-105 shadow-[0_0_50px_rgba(34,197,94,0.6)]' : ''}
                        flex items-center justify-center active:scale-95
                    `}
                >
                    {feedbackMsg && (
                        <span className={`text-4xl font-black ${feedbackColor} animate-bounce drop-shadow-md pointer-events-none`}>
                            {feedbackMsg}
                        </span>
                    )}
                </div>
                
                {/* Ping animation for target */}
                {trialPhase === 'target' && !feedbackMsg && (
                    <div className={`absolute inset-0 rounded-full ${targetColorClass} animate-ping opacity-50 pointer-events-none`} />
                )}
            </div>
            
            <div className="absolute bottom-12 text-white/20 text-xs font-mono">
                Runde {currentTrialIndex + 1} / {numTrials}
            </div>
        </div>
      );
  }

  // SUMMARY
  return (
    <div 
        className="h-full w-full flex flex-col items-center justify-center p-8 bg-black text-white cursor-pointer"
        onClick={() => onComplete(true)}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-black pointer-events-none" />
        
        <h2 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2 z-10">Runde beendet</h2>
        <div className="text-8xl font-black mb-12 drop-shadow-[0_0_30px_rgba(34,197,94,0.4)] z-10 animate-bounce">
            {sessionStats.score}
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-12 z-10">
             <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-400">{sessionStats.hits}</div>
                <div className="text-[10px] text-white/50 uppercase">Treffer</div>
             </div>
             <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-400">{sessionStats.avgRt}ms</div>
                <div className="text-[10px] text-white/50 uppercase">Tempo</div>
             </div>
             <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-orange-400">{sessionStats.falseAlarms}</div>
                <div className="text-[10px] text-white/50 uppercase">Falsch</div>
             </div>
             <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-400">{sessionStats.misses}</div>
                <div className="text-[10px] text-white/50 uppercase">Fehler</div>
             </div>
        </div>

        <div className="text-white/30 text-sm font-mono animate-pulse z-10 uppercase tracking-widest">
            Tippen zum Fortfahren
        </div>
    </div>
  );
};