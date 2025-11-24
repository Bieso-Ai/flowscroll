import React, { useEffect, useState } from 'react';
import { TaskData, TaskCategory, TaskType } from '../types';
import { MathTask } from './tasks/MathTask';
import { ReactionTask } from './tasks/ReactionTask';
import { MusicMemoryTask } from './tasks/MusicMemoryTask';
import { MathStreamTask } from './tasks/MathStreamTask';
import { MusicTask } from './tasks/MusicTask';
import { LanguageOddOneOutTask } from './tasks/LanguageOddOneOutTask';
import { LanguageConnectTask } from './tasks/LanguageConnectTask';
import { ReactionStreamTask } from './tasks/ReactionStreamTask';
import { ReactionColorSwitchTask } from './tasks/ReactionColorSwitchTask';
import { MathSequenceTask } from './tasks/MathSequenceTask';

interface Props {
  task: TaskData;
  isActive: boolean;
  isPaused?: boolean;
  onComplete: (taskId: string, success: boolean, timeSpent: number) => void;
}

// Random vibrant gradients for background
const GRADIENTS = [
  "from-pink-500 via-red-500 to-yellow-500",
  "from-green-400 via-emerald-500 to-teal-500",
  "from-blue-500 via-indigo-500 to-purple-500",
  "from-orange-400 via-orange-500 to-red-500",
  "from-violet-500 via-purple-500 to-fuchsia-500",
  "from-cyan-500 via-blue-500 to-indigo-500",
];

const CATEGORY_MAP: Record<TaskCategory, string> = {
    [TaskCategory.MATH]: 'MATHE',
    [TaskCategory.LANGUAGE]: 'SPRACHE',
    [TaskCategory.REACTION]: 'REAKTION',
    [TaskCategory.MUSIC]: 'MUSIK',
    [TaskCategory.FREE_MIND]: 'ENTSPANNUNG'
};

export const TaskCard: React.FC<Props> = ({ task, isActive, isPaused = false, onComplete }) => {
  const gradientIndex = task.id.charCodeAt(0) % GRADIENTS.length;
  const gradient = GRADIENTS[gradientIndex];

  // --- SMART TIMER LOGIC ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastResumeTime, setLastResumeTime] = useState<number | null>(null);

  useEffect(() => {
    if (isActive && !isPaused) {
        // RESUME: Mark the time we started/resumed
        setLastResumeTime(Date.now());
    } else {
        // PAUSE: Calculate time since last resume and add to total elapsed
        if (lastResumeTime !== null) {
            setElapsedTime(prev => prev + (Date.now() - lastResumeTime));
            setLastResumeTime(null);
        }
    }
  }, [isActive, isPaused]);

  const handleComplete = (success: boolean) => {
    let currentSessionTime = 0;
    if (lastResumeTime !== null) {
        currentSessionTime = Date.now() - lastResumeTime;
    }
    const totalTimeSpent = elapsedTime + currentSessionTime;
    onComplete(task.id, success, totalTimeSpent);
  };

  return (
    <div 
        className={`h-[100dvh] w-full snap-start snap-stop-always flex-shrink-0 relative overflow-hidden bg-gradient-to-br ${gradient}`}
        // FORCE Scroll Snap Stop via inline style to ensure browser respects it (Tailwind class sometimes overridden)
        style={{ scrollSnapStop: 'always' }}
    >
      {/* Background Texture/Noise could go here */}
      <div className="absolute inset-0 bg-black/10" />

      <div className="relative h-full w-full flex flex-col">
        {/* Top Info Bar - FIXED for iOS Safe Area */}
        {/* Changed absolute top-4 to top-0 with dynamic padding that respects notch/dynamic island */}
        <div className="absolute top-0 left-0 right-0 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] flex justify-between items-center text-white/80 z-10 pointer-events-none">
          <div className="text-sm font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
             Lvl {task.difficultyLevel}
          </div>
          <div className="text-xs font-mono opacity-60 uppercase">
             {CATEGORY_MAP[task.category] || task.category}
          </div>
        </div>

        {/* Task Content */}
        <div className="flex-1">
          {task.category === TaskCategory.MATH && task.type !== TaskType.MATH_STREAM && task.type !== TaskType.MATH_SEQUENCE && (
            <MathTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
           {task.type === TaskType.MATH_STREAM && (
            <MathStreamTask task={task} isActive={isActive} isPaused={isPaused} onComplete={handleComplete} />
          )}
          {task.type === TaskType.MATH_SEQUENCE && (
            <MathSequenceTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
          {(task.type === TaskType.REACTION_COLOR || task.type === TaskType.REACTION_SHAPE) && (
            <ReactionTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
          {task.type === TaskType.REACTION_STREAM && (
            <ReactionStreamTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
           {task.type === TaskType.REACTION_COLOR_SWITCH && (
            <ReactionColorSwitchTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
          {task.type === TaskType.MUSIC_MEMORY && (
            <MusicMemoryTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
          {task.type === TaskType.MUSIC_RHYTHM && (
            <MusicTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
          {task.type === TaskType.LANG_ODD_ONE_OUT && (
            <LanguageOddOneOutTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
          {task.type === TaskType.LANG_CONNECT && (
            <LanguageConnectTask task={task} isActive={isActive && !isPaused} onComplete={handleComplete} />
          )}
        </div>
      </div>
    </div>
  );
};