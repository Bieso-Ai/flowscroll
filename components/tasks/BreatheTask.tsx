import React, { useState, useEffect, useRef } from 'react';
import { TaskData } from '../../types';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const BreatheTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'hold'>('inhale');
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [message, setMessage] = useState('Einatmen');
  
  const totalCycles = task.content.cycles || 3;
  const inhaleTime = task.content.inhaleTime || 4000;
  const exhaleTime = task.content.exhaleTime || 4000;

  // Track if component is mounted
  const isActiveRef = useRef(isActive);
  
  // Ref to store the cleanup function for the current sound
  const soundStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
        setPhase('inhale');
        setCyclesCompleted(0);
        setMessage('Bereit?');
        
        // STOP SOUND INSTANTLY IF USER SWIPES AWAY
        if (soundStopRef.current) {
            soundStopRef.current();
            soundStopRef.current = null;
        }
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    let timer: ReturnType<typeof setTimeout>;

    const runCycle = () => {
        if (cyclesCompleted >= totalCycles) {
            setMessage('Gut gemacht.');
            setTimeout(() => {
                if (isActiveRef.current) onComplete(true);
            }, 1000);
            return;
        }

        // INHALE
        setPhase('inhale');
        setMessage('Einatmen...');
        
        // Clean up previous sound if any, then start new one
        if (soundStopRef.current) soundStopRef.current();
        soundStopRef.current = playSound('breath');

        timer = setTimeout(() => {
            if (!isActiveRef.current) return;
            
            // EXHALE
            setPhase('exhale');
            setMessage('Ausatmen...');
            // Exhale usually doesn't have a sound or has a quieter one, 
            // the breath sound is long enough to cover inhale
            
            timer = setTimeout(() => {
                if (!isActiveRef.current) return;
                setCyclesCompleted(prev => prev + 1);
            }, exhaleTime);

        }, inhaleTime);
    };

    // Start cycle if not done
    if (cyclesCompleted < totalCycles) {
        runCycle();
    }

    return () => {
        clearTimeout(timer);
        // Cleanup sound on unmount/re-render if still playing
        if (soundStopRef.current) {
            soundStopRef.current();
        }
    };
  }, [isActive, cyclesCompleted, totalCycles, inhaleTime, exhaleTime]);

  // Dynamic scaling based on phase
  const getScale = () => {
      if (phase === 'inhale') return 'scale-100 opacity-100'; // Large
      return 'scale-50 opacity-60'; // Small
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Ambient Background Glow */}
        <div className={`absolute inset-0 bg-cyan-500/10 transition-opacity duration-[4000ms] ${phase === 'inhale' ? 'opacity-100' : 'opacity-20'}`} />

        <div className="z-10 flex flex-col items-center gap-8">
            <h2 className="text-2xl font-bold text-cyan-200 tracking-widest uppercase">Entspannung</h2>
            
            {/* Breathing Sphere */}
            <div className="relative flex items-center justify-center w-64 h-64">
                <div className={`absolute w-full h-full bg-cyan-400 rounded-full blur-2xl transition-all ease-in-out duration-[4000ms] ${getScale()}`} />
                <div className={`absolute w-48 h-48 bg-cyan-200 rounded-full shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all ease-in-out duration-[4000ms] ${getScale()}`} />
                
                {/* Center Counter (Optional, minimal is better) */}
                <div className="absolute text-cyan-900 font-bold text-lg opacity-50">
                    {cyclesCompleted}/{totalCycles}
                </div>
            </div>

            <p className="text-4xl font-light text-white font-mono animate-pulse transition-all">
                {message}
            </p>
        </div>
    </div>
  );
};