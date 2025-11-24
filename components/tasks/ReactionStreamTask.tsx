
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

interface GameStats {
    hits: number;
    misses: number;
    falseAlarms: number;
    score: number;
    avgRt: number;
}

export const ReactionStreamTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  // --- CONFIG ---
  const { 
      targetEmoji, 
      distractors, 
      numTargetEvents, 
      distractorRatio, 
      minInterval, 
      maxInterval, 
      displayDuration, 
      tier 
  } = task.content;

  // --- STATE ---
  const [phase, setPhase] = useState<'instruction' | 'playing' | 'summary'>('instruction');
  const [emojiState, setEmojiState] = useState<{ char: string, top: number, left: number, id: number, size: string } | null>(null);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | 'wrong' | null>(null);
  const [progress, setProgress] = useState(0);
  const [finalStats, setFinalStats] = useState<GameStats>({ hits: 0, misses: 0, falseAlarms: 0, score: 0, avgRt: 0 });

  // --- REFS (Mutable Game State) ---
  const gameState = useRef({
      targetsShown: 0,
      hits: 0,
      falseAlarms: 0,
      reactionTimes: [] as number[],
      isTargetOnScreen: false,
      targetAppearTime: 0,
      hasInteractedWithCurrent: false
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef(0); // COOLDOWN REF

  // --- MEMOIZED PARTICLES (Visuals) ---
  const particles = useMemo(() => Array.from({ length: 12 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 10 + 5
  })), []);

  // --- LIFECYCLE ---
  useEffect(() => {
      if (!isActive) {
          stopGame();
          setPhase('instruction');
      }
  }, [isActive]);

  const stopGame = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setEmojiState(null);
  };

  // --- GAME ENGINE ---

  const startGame = () => {
      setPhase('playing');
      setEmojiState(null);
      setFeedback(null);
      setProgress(0);
      
      // Reset State
      gameState.current = {
          targetsShown: 0,
          hits: 0,
          falseAlarms: 0,
          reactionTimes: [],
          isTargetOnScreen: false,
          targetAppearTime: 0,
          hasInteractedWithCurrent: false
      };

      scheduleNextEvent();
  };

  const scheduleNextEvent = () => {
      if (!isActive) return;

      // 1. Check End Condition
      if (gameState.current.targetsShown >= numTargetEvents) {
          finishGame();
          return;
      }

      // 2. Update Progress
      setProgress((gameState.current.targetsShown / numTargetEvents) * 100);

      // 3. Wait random interval
      const delay = Math.random() * (maxInterval - minInterval) + minInterval;
      
      timeoutRef.current = setTimeout(() => {
          triggerEvent();
      }, delay);
  };

  const triggerEvent = () => {
      if (!isActive) return;

      // Decide: Target or Distractor?
      const isTarget = Math.random() < (1 / (distractorRatio + 1));
      
      const char = isTarget 
          ? targetEmoji 
          : distractors[Math.floor(Math.random() * distractors.length)];

      // Position (avoiding edges)
      const top = 20 + Math.random() * 60;
      const left = 20 + Math.random() * 60;

      // Dynamic Size
      let fontSize = '4rem';
      if (tier === 'medium') fontSize = Math.random() > 0.5 ? '3.5rem' : '4.5rem';
      if (tier === 'hard') fontSize = Math.random() > 0.5 ? '2.5rem' : '5rem';

      // Update State
      setEmojiState({ char, top, left, id: Date.now(), size: fontSize });
      playSound('beat');

      // Update Logic Refs
      gameState.current.isTargetOnScreen = isTarget;
      gameState.current.targetAppearTime = Date.now();
      gameState.current.hasInteractedWithCurrent = false;

      if (isTarget) {
          gameState.current.targetsShown++;
      }

      // Schedule Disappear / Timeout
      timeoutRef.current = setTimeout(() => {
          handleEmojiTimeout(isTarget);
      }, displayDuration);
  };

  const handleEmojiTimeout = (wasTarget: boolean) => {
      setEmojiState(null); // Hide emoji

      // Check Miss (If it was a target and user didn't tap)
      if (wasTarget && !gameState.current.hasInteractedWithCurrent) {
          flashFeedback('miss');
          playSound('wrong');
      }

      scheduleNextEvent();
  };

  // --- INTERACTION ---

  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
      // Prevent parent swipe
      if (e.cancelable) e.preventDefault();
      e.stopPropagation(); 

      const now = Date.now();
      
      // --- CRITICAL COOLDOWN FIX ---
      // Ignore taps if less than 200ms has passed since last tap
      if (now - lastTapTime.current < 200) return;
      lastTapTime.current = now;

      if (phase === 'summary') {
          onComplete(true);
          return;
      }
      if (phase !== 'playing') return;

      // Logic
      // IMPORTANT: Check interaction flag BEFORE checking empty state.
      // This prevents the "Double Tap Bug" where a fast second tap on a fading/gone emoji
      // counts as a "False Alarm" on an empty screen.
      if (gameState.current.hasInteractedWithCurrent) return;

      if (!emojiState) {
          // Tapped empty screen -> False Alarm
          recordFalseAlarm();
          return;
      }

      gameState.current.hasInteractedWithCurrent = true;

      if (gameState.current.isTargetOnScreen) {
          // HIT!
          const rt = now - gameState.current.targetAppearTime;
          gameState.current.hits++;
          gameState.current.reactionTimes.push(rt);
          
          flashFeedback('hit');
          playSound('tap');
          
          // Immediate next event on success feels snappier
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setEmojiState(null);
          setTimeout(scheduleNextEvent, 200); 

      } else {
          // Tapped Distractor -> False Alarm
          recordFalseAlarm();
      }
  };

  const recordFalseAlarm = () => {
      gameState.current.falseAlarms++;
      flashFeedback('wrong');
      playSound('wrong');
  };

  const flashFeedback = (type: 'hit' | 'miss' | 'wrong') => {
      setFeedback(type);
      setTimeout(() => setFeedback(null), 150);
  };

  const finishGame = () => {
      const { hits, falseAlarms, reactionTimes, targetsShown } = gameState.current;
      const misses = targetsShown - hits;
      
      const avgRt = reactionTimes.length > 0 
          ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
          : 0;

      // Score Calculation
      let score = 100;
      score += (hits * 10);
      score -= (misses * 5);
      score -= (falseAlarms * 5);
      if (avgRt > 0 && avgRt < 600) score += Math.round((600 - avgRt) / 10);
      score = Math.max(0, score);

      setFinalStats({ hits, misses, falseAlarms, avgRt, score });
      setPhase('summary');
      playSound('correct');
  };

  // --- VIEWS ---

  if (phase === 'instruction') {
      return (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 relative overflow-hidden">
              {/* Background Particles */}
              {particles.map((p, i) => (
                  <div key={i} 
                      className="absolute bg-white rounded-full opacity-10"
                      style={{
                          left: `${p.x}%`, top: `${p.y}%`,
                          width: `${p.size}px`, height: `${p.size}px`,
                          transform: 'translate3d(0,0,0)' // Hardware accel
                      }}
                  />
              ))}

              <div className="z-10 text-center flex flex-col items-center gap-6 p-6">
                  <div className="text-8xl animate-bounce drop-shadow-lg">{targetEmoji}</div>
                  
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase">
                      Ziel Fokus
                  </h2>
                  
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 max-w-xs">
                      <p className="text-lg text-white leading-relaxed">
                          Tippe nur auf <span className="font-bold text-cyan-300 text-2xl align-middle">{targetEmoji}</span>
                          <br/>
                          Ignoriere den Rest.
                      </p>
                  </div>

                  <button 
                      onClick={startGame}
                      className="px-10 py-4 bg-blue-600 text-white font-bold rounded-full text-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                      Start
                  </button>
              </div>
          </div>
      );
  }

  if (phase === 'playing') {
      return (
          <div 
              className="h-full w-full relative overflow-hidden bg-gray-900 touch-manipulation select-none"
              onMouseDown={handleTap}
              onTouchStart={handleTap}
          >
              {/* Feedback Overlay */}
              <div className={`absolute inset-0 pointer-events-none transition-opacity duration-100 z-40 ${
                  feedback === 'hit' ? 'bg-green-500/20' : 
                  feedback === 'wrong' ? 'bg-red-500/30' : 
                  feedback === 'miss' ? 'bg-red-500/10' : 'opacity-0'
              }`} />

              {/* Progress Bar */}
              <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-600 z-30 transition-all duration-500" 
                   style={{ width: `${progress}%` }} 
              />

              {/* Background Gradient Shift */}
              <div className="absolute inset-0 z-0 transition-colors duration-1000"
                   style={{ background: `linear-gradient(to bottom, #111827, hsl(260, 50%, ${10 + (progress/5)}%))` }}
              />

              {/* Emoji */}
              {emojiState && (
                  <div 
                      key={emojiState.id} // Force re-render for animation reset
                      className="absolute select-none z-50 flex items-center justify-center"
                      style={{
                          top: `${emojiState.top}%`,
                          left: `${emojiState.left}%`,
                          fontSize: emojiState.size,
                          transform: 'translate(-50%, -50%) scale(1)',
                          animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}
                  >
                      {emojiState.char}
                  </div>
              )}

              {/* Animation Keyframes */}
              <style>{`
                  @keyframes popIn {
                      from { transform: translate(-50%, -50%) scale(0); }
                      to { transform: translate(-50%, -50%) scale(1); }
                  }
              `}</style>
          </div>
      );
  }

  return (
      <div 
          className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-6 cursor-pointer"
          onClick={() => onComplete(true)}
      >
          <div className="text-center space-y-2 mb-10">
              <h2 className="text-gray-400 uppercase tracking-widest text-sm font-bold">Ergebnis</h2>
              <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                  {finalStats.score}
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-12">
              <StatBox label="Treffer" value={finalStats.hits} color="text-green-400" />
              <StatBox label="Tempo" value={`${finalStats.avgRt}ms`} color="text-blue-400" />
              <StatBox label="Fehler" value={finalStats.misses} color="text-red-400" />
              <StatBox label="Falsch" value={finalStats.falseAlarms} color="text-orange-400" />
          </div>

          <div className="text-white/30 animate-pulse text-sm uppercase tracking-widest">
              Tippen zum Fortfahren
          </div>
      </div>
  );
};

const StatBox = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-[10px] text-white/40 uppercase font-bold mt-1">{label}</div>
    </div>
);
