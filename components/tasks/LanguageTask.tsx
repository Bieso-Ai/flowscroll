import React, { useState, useRef, useEffect } from 'react';
import { TaskData, TaskType } from '../../types';
import { validateSentenceWithGemini } from '../../services/geminiService';
import { playSound } from '../../services/audioService';

interface Props {
  task: TaskData;
  onComplete: (success: boolean) => void;
  isActive: boolean;
}

export const LanguageTask: React.FC<Props> = ({ task, onComplete, isActive }) => {
  const [input, setInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showSolutionBtn, setShowSolutionBtn] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Track mounted state for async calls
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || checking) return;
    
    setChecking(true);
    let success = false;
    
    if (task.type === TaskType.LANG_SYNONYM) {
        const validSynonyms = task.content.synonyms.map((s: string) => s.toLowerCase());
        if (validSynonyms.includes(input.toLowerCase())) {
            success = true;
        }
    } else if (task.type === TaskType.LANG_RHYME) {
        const validRhymes = task.content.rhymes.map((r: string) => r.toLowerCase());
        if (validRhymes.includes(input.toLowerCase())) {
            success = true;
        }
    } else if (task.type === TaskType.LANG_SENTENCE) {
        success = await validateSentenceWithGemini(task.content.word1, task.content.word2, input);
    }

    if (!isActiveRef.current) return; // Check if user swiped away

    if (success) {
        playSound('correct');
        setFeedback("Excellent!");
        setShowSolutionBtn(false);
        setTimeout(() => {
            if (isActiveRef.current) onComplete(true);
        }, 1000);
    } else {
        playSound('wrong');
        setFeedback("Try again!");
        setChecking(false);
        setShowSolutionBtn(true); // Show solution button after fail
    }
  };

  const handleShowSolution = () => {
      let solution = "";
      if (task.type === TaskType.LANG_SYNONYM) {
          solution = task.content.synonyms[0];
      } else if (task.type === TaskType.LANG_RHYME) {
          solution = task.content.rhymes[0];
      } else {
          solution = task.content.exampleSentence;
      }

      setInput(solution);
      setFeedback("Solution Revealed");
      setShowSolutionBtn(false);
      setChecking(true); // Lock input
      playSound('tap');

      // Complete as failure/skipped after reading time
      setTimeout(() => {
          if (isActiveRef.current) onComplete(false);
      }, 2500);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md bg-black/20 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="text-xs font-bold text-blue-400 mb-2 tracking-widest uppercase">{task.type}</div>
            
            {task.type === TaskType.LANG_SENTENCE ? (
                <div className="mb-6">
                    <p className="text-white/70 text-lg mb-2">Create a sentence using:</p>
                    <div className="flex gap-2 justify-center text-2xl font-bold text-white">
                        <span className="bg-white/10 px-3 py-1 rounded">{task.content.word1}</span>
                        <span>+</span>
                        <span className="bg-white/10 px-3 py-1 rounded">{task.content.word2}</span>
                    </div>
                </div>
            ) : (
                <div className="mb-6">
                     <p className="text-white/70 text-lg mb-2">
                        {task.type === TaskType.LANG_SYNONYM ? "Find a synonym for:" : "Find a rhyme for:"}
                     </p>
                     <div className="text-4xl font-bold text-white">{task.content.word}</div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-blue-500 outline-none"
                    placeholder="Type your answer..."
                    autoComplete="off"
                />
                
                <button 
                    disabled={checking}
                    className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                        checking ? 'bg-gray-500 text-gray-300' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/50'
                    }`}
                >
                    {checking ? 'Checking...' : 'Submit'}
                </button>

                {showSolutionBtn && !checking && (
                    <button 
                        type="button"
                        onClick={handleShowSolution}
                        className="w-full py-2 rounded-xl font-bold text-sm border border-yellow-500/50 text-yellow-200 hover:bg-yellow-500/20 transition-colors"
                    >
                        Show Solution (Skip)
                    </button>
                )}
            </form>

            {feedback && <div className={`mt-4 text-center font-bold text-lg ${feedback === 'Solution Revealed' ? 'text-yellow-400' : 'animate-bounce'}`}>{feedback}</div>}
            
            <div className="mt-6 pt-6 border-t border-white/10 text-sm text-white/40 text-center">
                <p className="font-mono">Hint: {task.content.hint || (task.content.exampleSentence ? "Combine meaningfully" : "")}</p>
            </div>
        </div>
    </div>
  );
};