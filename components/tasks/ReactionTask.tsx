import React, { useState, useEffect, useRef } from 'react';
import { TaskData, TaskType } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const ReactionTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [gameState, setGameState] = useState<'waiting' | 'ready' | 'clicked' | 'early' | 'shape_active' | 'shape_done'>('waiting');
  const [startTime, setStartTime] = useState(0);
  const [reactionTimeMs, setReactionTimeMs] = useState(0);
  
  // For Color Task (Reaction Time)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch Tracking Refs
  const touchStartData = useRef<{time: number, y: number} | null>(null);
  const isSwiping = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    if (task.type === TaskType.REACTION_COLOR) {
      setGameState('waiting');
      const delay = Math.random() * (task.content.waitMax - task.content.waitMin) + task.content.waitMin;
      timeoutRef.current = setTimeout(() => {
        setGameState('ready');
        setStartTime(Date.now());
      }, delay);
    } else {
        // Odd-One-Out task starts immediately
        setGameState('shape_active');
        setStartTime(Date.now());
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isActive, task]);

  // Unified Reaction Trigger Logic
  const triggerReaction = (interactionTime: number) => {
      if (gameState === 'waiting') {
          // FAIL: Too early
          setGameState('early');
          playSound('wrong');
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setTimeout(() => onComplete(false), 1000);
      } else if (gameState === 'ready') {
          // Check for "Holding cheat": Did they press before it turned green?
          if (interactionTime < startTime) {
             setGameState('early');
             playSound('wrong');
             setTimeout(() => onComplete(false), 1000);
             return;
          }

          // SUCCESS
          const time = interactionTime - startTime;
          setReactionTimeMs(time);
          setGameState('clicked');
          playSound('tap');
          setTimeout(() => onComplete(true), 800);
      }
  };

  // --- TOUCH HANDLERS (Swipe vs Tap Detection) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartData.current = {
          time: Date.now(),
          y: e.touches[0].clientY
      };
      isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartData.current) return;
      const diff = Math.abs(e.touches[0].clientY - touchStartData.current.y);
      if (diff > 10) { // Threshold for swipe detection
          isSwiping.current = true;
      }
  };

  const handleTouchEnd = () => {
      if (!touchStartData.current) return;
      
      // If user swiped, ignore this interaction (let Feed handle scroll)
      if (isSwiping.current) {
          touchStartData.current = null;
          return;
      }

      // It was a clean tap -> Trigger Game Logic
      triggerReaction(touchStartData.current.time);
      touchStartData.current = null;
  };

  const handleMouseDown = () => {
      // Mouse fallback (no swipe logic needed usually)
      triggerReaction(Date.now());
  };

  const handleGridTap = (index: number) => {
    if (gameState !== 'shape_active') return;

    if (index === task.content.oddIndex) {
      const time = Date.now() - startTime;
      setReactionTimeMs(time);
      setGameState('shape_done');
      playSound('correct');
      setTimeout(() => onComplete(true), 800);
    } else {
      playSound('wrong');
    }
  };

  // --- RENDER: REACTION TIME (Traffic Light) ---
  if (task.type === TaskType.REACTION_COLOR) {
    let bgColor = "bg-gray-800";
    let text = "Warte auf Grün...";
    
    if (gameState === 'ready') {
      bgColor = "bg-green-500";
      text = "JETZT TIPPEN!";
    } else if (gameState === 'early') {
      bgColor = "bg-red-500";
      text = "Zu früh!";
    } else if (gameState === 'clicked') {
        bgColor = "bg-blue-500";
        text = "Super!";
    }

    return (
      <div 
        className={`h-full w-full flex flex-col items-center justify-center cursor-pointer transition-colors duration-100 ${bgColor}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter animate-pulse select-none">{text}</h2>
        {gameState === 'clicked' && (
             <div className="mt-2 text-6xl font-mono font-bold text-white drop-shadow-md">
                {reactionTimeMs}ms
             </div>
        )}
        <p className="mt-4 text-white/50 font-mono text-sm">Tippe sofort auf den Bildschirm</p>
      </div>
    );
  }

  // --- RENDER: ODD ONE OUT (Grid) ---
  
  const { gridSize, oddIndex, mode, items, baseColor, oddColor } = task.content;
  const totalItems = gridSize * gridSize;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 relative">
        <h2 className="text-2xl font-bold text-white mb-2 shadow-black drop-shadow-md">
            {mode === 'COLOR' ? 'Finde die hellere Farbe' : 'Finde den Außenseiter'}
        </h2>
        
        {gameState === 'shape_done' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
                <div className="text-6xl font-mono font-bold text-green-400 drop-shadow-lg animate-bounce">
                    {reactionTimeMs}ms
                </div>
            </div>
        )}

        <div 
            className="grid gap-2 md:gap-3 bg-black/20 p-4 rounded-2xl backdrop-blur-sm"
            style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` 
            }}
        >
            {Array.from({ length: totalItems }).map((_, idx) => {
                const isOdd = idx === oddIndex;
                
                // RENDER CONTENT BASED ON MODE
                let content = null;
                let cellStyle = "bg-white/10"; // Default card style

                if (mode === 'COLOR') {
                    // Just colored blocks, no extra content
                    cellStyle = ""; // Reset default
                } else if (mode === 'EMOJI') {
                    content = <span className="text-3xl md:text-5xl select-none">{isOdd ? items.odd : items.base}</span>;
                } else if (mode === 'ROTATION') {
                     content = (
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" viewBox="0 0 24 24" 
                            strokeWidth={3} stroke="currentColor" 
                            className={`w-8 h-8 md:w-12 md:h-12 text-white transition-transform duration-0
                                ${isOdd ? 'rotate-90' : '-rotate-90'}
                            `}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                        </svg>
                     );
                } else {
                    // Fallback (Basic Shapes) - useful if mode is undefined for some reason
                    content = <div className={`bg-indigo-400 ${isOdd ? 'rounded-full' : 'rounded-md'} w-8 h-8 md:w-10 md:h-10`} />;
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleGridTap(idx)}
                        style={mode === 'COLOR' ? { 
                            backgroundColor: isOdd ? oddColor : baseColor,
                            width: '100%',
                            aspectRatio: '1/1'
                        } : undefined}
                        className={`
                            ${mode !== 'COLOR' ? 'w-16 h-16 md:w-20 md:h-20' : 'rounded-lg'} 
                            ${cellStyle} 
                            rounded-xl flex items-center justify-center 
                            active:scale-95 transition-transform shadow-sm
                        `}
                    >
                       {content}
                    </button>
                );
            })}
        </div>
    </div>
  );
};