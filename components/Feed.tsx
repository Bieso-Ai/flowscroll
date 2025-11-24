
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TaskData, UserStats, TaskResult } from '../types';
import { generateNextTask, updateStats, generateSessionId } from '../services/taskEngine';
import { TaskCard } from './TaskCard';
import { playSound } from '../services/audioService';
import { analyticsService } from '../services/analyticsService';

interface Props {
  userStats: UserStats;
  setUserStats: React.Dispatch<React.SetStateAction<UserStats>>;
  isPaused?: boolean;
}

// CONFIG
const BUFFER_SIZE = 3;
const ANIMATION_DURATION = 350; // Snappy, TikTok-like speed
const SWIPE_THRESHOLD = 80; // Pixel distance required to trigger
const VELOCITY_THRESHOLD = 0.3; // px/ms required to trigger a "flick"

export const Feed: React.FC<Props> = ({ userStats, setUserStats, isPaused = false }) => {
  // State
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  
  // Animation & Gesture State
  const [isAnimating, setIsAnimating] = useState(false); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Refs for Logic
  const activeIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const loadingMoreRef = useRef(false);
  
  // Refs for Touch/Mouse Handling
  const startY = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const currentY = useRef<number | null>(null);

  // Session Tracking
  const [sessionId] = useState(generateSessionId());
  const [sessionStartTime] = useState(Date.now());
  const [taskStartTime, setTaskStartTime] = useState(Date.now());

  // --- INITIALIZATION ---
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    
    const initTasks = async () => {
      const promises = Array(BUFFER_SIZE).fill(null).map(() => generateNextTask(userStats));
      const newTasks = await Promise.all(promises);
      setTasks(newTasks);
    };
    initTasks();
  }, []);

  // --- BUFFER MAINTENANCE ---
  useEffect(() => {
    if (tasks.length === 0) return; 

    const remaining = tasks.length - (activeIndex + 1);
    
    if (remaining < BUFFER_SIZE && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        const countNeeded = BUFFER_SIZE - remaining;
        
        const fetchMore = async () => {
            try {
                const promises = Array(countNeeded).fill(null).map(() => generateNextTask(userStats));
                const newTasks = await Promise.all(promises);
                setTasks(prev => [...prev, ...newTasks]);
            } catch (e) {
                console.error("Error buffering tasks", e);
            } finally {
                loadingMoreRef.current = false;
            }
        };
        fetchMore();
    }
  }, [activeIndex, tasks.length, userStats]);

  // --- ANALYTICS HANDLER ---
  const processTaskResult = useCallback((taskId: string, success: boolean, timeSpent: number, wasSkipped: boolean) => {
    setTasks(currentTasks => {
        const task = currentTasks.find(t => t.id === taskId);
        if (!task) return currentTasks;

        let outcome: 'success' | 'failed' | 'skipped' = 'skipped';
        if (success) outcome = 'success';
        else if (!wasSkipped) outcome = 'failed';

        const now = Date.now();
        const result: TaskResult = {
            taskId,
            type: task.type,
            success,
            outcome,
            timeSpentMs: timeSpent,
            timestamp: now,
            startTime: taskStartTime,
            difficultyLevel: task.difficultyLevel,
            wasSkipped,
            sessionId,
            sessionDurationMs: now - sessionStartTime
        };

        analyticsService.recordTaskResult(userStats.userId, result);
        const { newStats, decision } = updateStats(userStats, result); // Capture decision
        
        // We could log the decision here if needed, already handled in updateStats return
        
        setUserStats(newStats);
        
        return currentTasks;
    });
  }, [setUserStats, userStats, sessionId, sessionStartTime, taskStartTime]);

  const handleTaskComplete = useCallback((taskId: string, success: boolean, timeSpent: number) => {
    if (success) {
        setCompletedTaskIds(prev => new Set(prev).add(taskId));
    }
    processTaskResult(taskId, success, timeSpent, false);
  }, [processTaskResult]);


  // --- NAVIGATION LOGIC (THE CORE) ---

  const handleSwipeEnd = (targetOffset: number, indexChange: number) => {
      // 1. Start Animation to the target offset (visually moving to next/prev card)
      setIsAnimating(true);
      setDragOffset(targetOffset);

      // 2. Play Sound if changing
      if (indexChange !== 0) playSound('swipe');

      // 3. Wait for animation to finish, then "commit" the change
      setTimeout(() => {
          if (indexChange !== 0) {
              const newIndex = activeIndex + indexChange;
              
              // Analytics for skipped task
              if (indexChange > 0) {
                  const currentTask = tasks[activeIndex];
                  if (currentTask && !completedTaskIds.has(currentTask.id)) {
                      const timeSpent = Date.now() - taskStartTime;
                      processTaskResult(currentTask.id, false, timeSpent, true);
                  }
              }

              // SILENT SWAP:
              // Change Index to N+1
              // Change Offset to 0
              // Since (Index N + Offset Height) == (Index N+1 + Offset 0), this is visually invisible.
              setActiveIndex(newIndex);
              activeIndexRef.current = newIndex;
              setTaskStartTime(Date.now());
          }
          
          // Reset state for next interaction
          setDragOffset(0);
          setIsAnimating(false);
          
      }, ANIMATION_DURATION);
  };


  // --- INPUT HANDLERS (TOUCH & MOUSE) ---

  const handleStart = (clientY: number) => {
      if (isAnimating || isPaused) return;
      startY.current = clientY;
      currentY.current = clientY;
      startTime.current = Date.now();
      setIsDragging(true);
      setDragOffset(0); // Ensure we start from 0 relative to current card
  };

  const handleMove = (clientY: number) => {
      if (!isDragging || startY.current === null) return;
      currentY.current = clientY;
      const diff = clientY - startY.current;
      
      // Rubber banding at edges
      if ((activeIndex === 0 && diff > 0) || (activeIndex === tasks.length - 1 && diff < 0)) {
          setDragOffset(diff * 0.3); 
      } else {
          setDragOffset(diff);
      }
  };

  const handleEnd = () => {
      if (!isDragging || startY.current === null || currentY.current === null) return;
      setIsDragging(false);

      const diff = dragOffset;
      const time = Date.now() - startTime.current;
      const velocity = Math.abs(diff) / time;
      const containerHeight = containerRef.current?.clientHeight || window.innerHeight;

      // Determine Intent
      // Go Next (Swipe Up)
      if (diff < 0 && (Math.abs(diff) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)) {
          if (activeIndex < tasks.length - 1) {
              handleSwipeEnd(-containerHeight, 1);
          } else {
              handleSwipeEnd(0, 0); // Snap back at end
          }
      }
      // Go Prev (Swipe Down)
      else if (diff > 0 && (Math.abs(diff) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD)) {
          if (activeIndex > 0) {
              handleSwipeEnd(containerHeight, -1);
          } else {
              handleSwipeEnd(0, 0); // Snap back at start
          }
      }
      // Snap Back (Not enough movement)
      else {
          handleSwipeEnd(0, 0);
      }

      startY.current = null;
      currentY.current = null;
  };

  // Listeners
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientY);
  const onMouseMove = (e: React.MouseEvent) => isDragging && handleMove(e.clientY);
  const onMouseUp = () => isDragging && handleEnd();
  const onMouseLeave = () => isDragging && handleEnd();


  // --- RENDER ---
  
  // The Magic Formula:
  // 1. Base position: -100% * activeIndex (Standard slider)
  // 2. + dragOffset: Follows finger exactly (pixels)
  const transformStyle = {
      transform: `translate3d(0, calc(-${activeIndex * 100}% + ${dragOffset}px), 0)`,
      transition: isDragging ? 'none' : `transform ${ANIMATION_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
  };

  return (
    <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden relative bg-black touch-none select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
    >
      {/* VIRTUAL SLIDER */}
      <div 
        className="w-full h-full will-change-transform"
        style={transformStyle}
      >
        {tasks.map((task, index) => {
            // Performance: Only render current, prev, and next cards
            if (Math.abs(index - activeIndex) > 1) return <div key={task.id} className="h-full w-full" />;

            return (
                <div key={task.id} className="h-full w-full relative">
                    <TaskCard 
                        task={task} 
                        isActive={index === activeIndex}
                        isPaused={isPaused}
                        onComplete={handleTaskComplete}
                    />
                </div>
            );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-4 z-50">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <p className="text-white/50 animate-pulse text-sm font-mono">Initialisiere Flow...</p>
        </div>
      )}
    </div>
  );
};
