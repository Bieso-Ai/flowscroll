
import { TaskData, TaskType, TaskCategory, UserStats, TaskResult } from "../types";
import { generateLanguageTaskContent } from "./geminiService";

// --- HELPER: Safe UUID Generation ---
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateSessionId = () => `sess_${generateUUID().slice(0,8)}_${Date.now().toString(36)}`;

// Initial stats for a new user
// Math starts at Level 2 (3 Digits total) to be "Average" instead of trivial.
export const INITIAL_STATS: UserStats = {
  userId: generateUUID(),
  levels: {
    [TaskType.MATH_ADDITION]: 2, 
    [TaskType.MATH_SUBTRACTION]: 2,
    [TaskType.MATH_MULTIPLICATION]: 2,
    [TaskType.MATH_STREAM]: 1,
    [TaskType.MATH_SEQUENCE]: 1,
    [TaskType.REACTION_COLOR]: 1,
    [TaskType.REACTION_SHAPE]: 1,
    [TaskType.REACTION_STREAM]: 1,
    [TaskType.REACTION_COLOR_SWITCH]: 1,
    [TaskType.MUSIC_RHYTHM]: 1, 
    [TaskType.MUSIC_MEMORY]: 1,
    [TaskType.LANG_ODD_ONE_OUT]: 1,
    [TaskType.LANG_CONNECT]: 1,
    [TaskType.LANG_SYNONYM]: 1,
    [TaskType.LANG_RHYME]: 1,
    [TaskType.LANG_SENTENCE]: 1,
    [TaskType.FREE_MIND_BREATHE]: 1
  } as any,
  confidence: {} as any, 
  streaks: {} as any, 
  history: [],
  totalTimeMs: 0,
};

// --- DATA MIGRATION ---
export const migrateUserStats = (stats: any): UserStats => {
    const merged = { ...INITIAL_STATS, ...stats };
    
    // Ensure all level keys exist
    Object.keys(INITIAL_STATS.levels).forEach(key => {
        if (merged.levels[key] === undefined) {
            merged.levels[key] = 1;
        }
    });

    if (!merged.confidence) merged.confidence = {};
    if (!merged.streaks) merged.streaks = {};
    if (!merged.userId) merged.userId = generateUUID();
    
    return merged as UserStats;
};

// --- MATH ENGINE V3: FLOW ZONE & TOTAL DIGIT CAPACITY ---

const generateNumberWithDigits = (digits: number): number => {
    if (digits <= 0) return 0;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateFlowMathTask = (type: TaskType, level: number): Partial<TaskData> => {
    // Difficulty (Level) maps directly to "Total Digit Capacity" minus 1 offset
    // Level 1 = 2 Digits Total (1+1)
    // Level 2 = 3 Digits Total (2+1)
    // Level 3 = 4 Digits Total (2+2 or 3+1)
    
    const totalDigits = Math.floor(level) + 1;
    
    // Distribute digits between A and B
    // We want a split that is somewhat balanced but random
    // e.g. Total 5 -> 3+2 or 2+3 (rarely 4+1)
    
    let digitsA = Math.ceil(totalDigits / 2);
    let digitsB = Math.floor(totalDigits / 2);

    // Add randomness to the split for higher digit counts
    if (totalDigits >= 4 && Math.random() > 0.5) {
        // Swap sometimes
        [digitsA, digitsB] = [digitsB, digitsA];
    }

    // Generate operands
    let a = generateNumberWithDigits(digitsA);
    let b = generateNumberWithDigits(digitsB);

    // --- OPERATOR SPECIFIC RULES ---

    if (type === TaskType.MATH_ADDITION) {
        return {
            question: `${a} + ${b}`,
            solution: a + b,
            content: { a, b, operator: type }
        };
    } 
    
    else if (type === TaskType.MATH_SUBTRACTION) {
        // NO NEGATIVES: Ensure A >= B
        // If A < B, swap them. Or if A was generated with fewer digits, swap digits logic.
        if (a < b) {
            [a, b] = [b, a];
        }
        return {
            question: `${a} - ${b}`,
            solution: a - b,
            content: { a, b, operator: type }
        };
    }

    else if (type === TaskType.MATH_MULTIPLICATION) {
        // Multiplication scales way harder. 
        // Total Digits 4 (2x2) is much harder than 2+2.
        // We adjust the digit distribution for Mult.
        
        // Cap B to be smaller to keep it mental-math feasible
        // Level 1: 1x1 (Total 2)
        // Level 2: 2x1 (Total 3)
        // Level 3: 3x1 (Total 4) -> PREFER 3x1 over 2x2 initially
        // Level 4: 2x2 (Total 4)
        
        if (totalDigits === 4) {
             if (Math.random() > 0.5) { digitsA = 3; digitsB = 1; }
             else { digitsA = 2; digitsB = 2; }
        } else if (totalDigits >= 5) {
             // Cap B at 2 digits max for now
             digitsB = Math.min(2, digitsB);
             digitsA = totalDigits - digitsB;
        }

        a = generateNumberWithDigits(digitsA);
        b = generateNumberWithDigits(digitsB);

        // Special case for small levels: avoid 1xN triviality if possible unless level 1
        if (level > 1 && digitsB === 1) {
            b = Math.floor(Math.random() * 8) + 2; // 2-9
        }

        return {
            question: `${a} × ${b}`,
            solution: a * b,
            content: { a, b, operator: type }
        };
    }

    return {};
};

// --- LEGACY / OTHER GENERATORS ---

const generateMathSequenceTask = (level: number): Partial<TaskData> => {
      let patternType: 'linear' | 'progressive' | 'geometric' | 'fibonacci' | 'alternating' = 'linear';
      
      if (level >= 8) {
          const r = Math.random();
          if (r > 0.6) patternType = 'fibonacci';
          else if (r > 0.3) patternType = 'geometric';
          else patternType = 'alternating';
      } else if (level >= 4) {
          const r = Math.random();
          if (r > 0.5) patternType = 'progressive';
          else patternType = 'alternating';
      }

      let sequence: number[] = [];
      let current = Math.floor(Math.random() * 10) + 1;
      if (level > 5) current = Math.floor(Math.random() * 20) + 5;
      
      sequence.push(current);

      if (patternType === 'linear') {
          const step = Math.floor(Math.random() * 5) + 1 + Math.floor(level / 3);
          const isSub = Math.random() > 0.8 && current > 20;
          for(let i=0; i<4; i++) {
              current = isSub ? current - step : current + step;
              sequence.push(current);
          }
      } 
      else if (patternType === 'progressive') {
          const startStep = Math.floor(Math.random() * 2) + 1;
          const increment = Math.floor(Math.random() * 2) + 1;
          for(let i=0; i<4; i++) {
              const step = startStep + (i * increment);
              current += step;
              sequence.push(current);
          }
      }
      else if (patternType === 'geometric') {
          const factor = Math.random() > 0.7 ? 3 : 2;
          current = Math.floor(Math.random() * 3) + 1; 
          sequence = [current];
          for(let i=0; i<4; i++) {
              current *= factor;
              sequence.push(current);
          }
      }
      else if (patternType === 'fibonacci') {
          let a = Math.floor(Math.random() * 5) + 1;
          let b = Math.floor(Math.random() * 5) + 1;
          sequence = [a, b];
          for(let i=0; i<4; i++) {
              const next = a + b;
              sequence.push(next);
              a = b;
              b = next;
          }
      }
      else if (patternType === 'alternating') {
          const step1 = Math.floor(Math.random() * 3) + 2; 
          const step2 = Math.floor(Math.random() * 2) + 1; 
          for(let i=0; i<4; i++) {
              if (i % 2 === 0) current += step1;
              else current -= step2;
              sequence.push(current);
          }
      }

      const solution = sequence.pop()!;
      const displaySequence = sequence;
      const optionsSet = new Set<number>();
      optionsSet.add(solution);

      while(optionsSet.size < 4) {
          const offset = Math.floor(Math.random() * 5) + 1;
          const r = Math.random();
          let fake = 0;
          if (r < 0.3) fake = solution + offset;
          else if (r < 0.6) fake = solution - offset;
          else if (r < 0.8) fake = solution + 10;
          else fake = solution - 10;
          if (fake !== solution) optionsSet.add(fake);
      }

      return {
          question: "Setze die Reihe fort",
          solution: solution,
          content: {
              sequence: displaySequence,
              options: Array.from(optionsSet).sort(() => Math.random() - 0.5),
              correctValue: solution
          }
      };
};

const generateReactionTask = (type: TaskType, level: number): Partial<TaskData> => {
  if (type === TaskType.REACTION_COLOR) {
    const decay = Math.pow(0.9, level);
    const waitMin = Math.max(1000, 3500 * decay); 
    const waitMax = Math.max(2000, 5000 * decay);

    return {
      question: "Tippe bei Grün",
      content: { waitMin, waitMax },
      solution: 0 
    };
  } else if (type === TaskType.REACTION_SHAPE) {
    const gridSize = Math.min(5, 2 + Math.floor(level / 3));
    const oddIndex = Math.floor(Math.random() * (gridSize * gridSize));
    
    const modes = ['EMOJI', 'ROTATION'];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    
    const items = { base: 'A', odd: 'B' }; 
    if (mode === 'EMOJI') {
        const pairs = [
            { base: '😐', odd: '😶' }, { base: '😀', odd: '😃' }, 
            { base: '⚪', odd: '⚫' }, { base: '⬛', odd: '⬜' },
            { base: '🍎', odd: '🍅' }, { base: '🕒', odd: '🕓' }
        ];
        const p = pairs[Math.floor(Math.random() * pairs.length)];
        items.base = p.base;
        items.odd = p.odd;
    }

    return {
      question: "Finde den Außenseiter",
      content: { gridSize, oddIndex, mode, items },
      solution: oddIndex
    };
  } else if (type === TaskType.REACTION_COLOR_SWITCH) {
      let tier: 'easy' | 'medium' | 'hard' = 'easy';
      if (level >= 8) tier = 'hard';
      else if (level >= 4) tier = 'medium';

      let params = {
          numTrials: 5, 
          distractorStepMin: 2,
          distractorStepMax: 4,
          colorChangeSpeed: 800, 
          targetWindow: 1200, 
          distractors: ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500'],
          targetColorClass: 'bg-green-500',
          targetColorName: 'Grün'
      };

      if (tier === 'medium') {
          params = {
              numTrials: 8,
              distractorStepMin: 3,
              distractorStepMax: 6,
              colorChangeSpeed: 600,
              targetWindow: 900,
              distractors: ['bg-red-500', 'bg-blue-600', 'bg-yellow-500', 'bg-purple-600', 'bg-orange-500', 'bg-pink-500'],
              targetColorClass: 'bg-green-500',
              targetColorName: 'Grün'
          };
      } else if (tier === 'hard') {
          params = {
              numTrials: 10,
              distractorStepMin: 4,
              distractorStepMax: 8,
              colorChangeSpeed: 400,
              targetWindow: 600,
              distractors: ['bg-teal-500', 'bg-lime-500', 'bg-emerald-700', 'bg-cyan-500', 'bg-yellow-400'],
              targetColorClass: 'bg-green-500',
              targetColorName: 'Grün'
          };
      }

      return {
          question: `Tippe nur bei ${params.targetColorName}`,
          content: { tier, ...params },
          solution: null
      };

  } else {
    let tier: 'easy' | 'medium' | 'hard' = 'easy';
    if (level >= 8) tier = 'hard';
    else if (level >= 4) tier = 'medium';

    let params = {
        numTargetEvents: 3, // Reduced from 5
        distractorRatio: 2, 
        minInterval: 800,
        maxInterval: 1400,
        displayDuration: 800,
        emojiSize: 'text-7xl'
    };

    if (tier === 'medium') {
        params = {
            numTargetEvents: 4, // Reduced from 7
            distractorRatio: 3,
            minInterval: 600,
            maxInterval: 1100,
            displayDuration: 600,
            emojiSize: 'text-6xl'
        };
    } else if (tier === 'hard') {
        params = {
            numTargetEvents: 5, // Reduced from 10
            distractorRatio: 4,
            minInterval: 400,
            maxInterval: 900,
            displayDuration: 450,
            emojiSize: 'text-5xl'
        };
    }

    const EMOJI_SETS = [
        { target: '🦊', distractors: ['🐶', '🐱', '🦁', '🐯', '🐻', '🐨', '🐼'] },
        { target: '⚽', distractors: ['🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'] },
        { target: '🍎', distractors: ['🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓'] },
        { target: '🚀', distractors: ['✈️', '🚁', '🚂', '🚗', '🚌', '🚲', '🛵'] },
        { target: '⭐', distractors: ['🌟', '✨', '💫', '☀️', '🌙', '⚡', '❄️'] },
    ];
    const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];

    return {
        question: "Ziel Fokus",
        content: {
            tier,
            targetEmoji: set.target,
            distractors: set.distractors,
            ...params
        },
        solution: null 
    };
  }
};

const generateMusicTask = (type: TaskType, level: number): Partial<TaskData> => {
  if (type === TaskType.MUSIC_RHYTHM) {
      const steps = 4 + Math.floor(level / 2);
      const complexity = Math.min(0.8, 0.2 + (level * 0.05));
      const pattern = [];
      const instruments = ['kick', 'snare', 'hihat', 'tom'];
      for(let i=0; i<steps; i++) {
          const timeOffset = i * 500;
          if (i === 0 || Math.random() < complexity) {
              const inst = i === 0 ? 'kick' : instruments[Math.floor(Math.random() * instruments.length)];
              pattern.push({ timeOffset, type: inst });
          }
      }
      return {
          question: "Wiederhole den Beat",
          content: { pattern, totalDuration: steps * 500 },
          solution: pattern
      };
  } else {
      const length = 3 + Math.floor(level / 2);
      const speed = Math.max(300, 800 - (level * 50));
      const sequence = [];
      const activePads = Math.min(4, 2 + Math.floor(level / 3));
      for(let i=0; i<length; i++) {
          sequence.push(Math.floor(Math.random() * activePads));
      }
      return {
          question: "Merke dir den Klang",
          content: { sequence, playbackSpeed: speed, activePads },
          solution: sequence
      };
  }
};


// --- MAIN ENGINE ---

export const generateNextTask = async (userStats: UserStats): Promise<TaskData> => {
  const id = generateUUID();
  
  // Weights
  const weights = {
    [TaskCategory.MATH]: 0.40, 
    [TaskCategory.REACTION]: 0.30,
    [TaskCategory.MUSIC]: 0.10,
    [TaskCategory.LANGUAGE]: 0.20
  };

  const rand = Math.random();
  let category = TaskCategory.REACTION;
  let cumulative = 0;
  
  for (const [cat, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand < cumulative) {
      category = cat as TaskCategory;
      break;
    }
  }

  // Select Type
  let type: TaskType;
  if (category === TaskCategory.MATH) {
     const types = [TaskType.MATH_ADDITION, TaskType.MATH_SUBTRACTION, TaskType.MATH_MULTIPLICATION, TaskType.MATH_SEQUENCE];
     type = types[Math.floor(Math.random() * types.length)];
  } else if (category === TaskCategory.REACTION) {
     const types = [TaskType.REACTION_COLOR, TaskType.REACTION_SHAPE, TaskType.REACTION_STREAM, TaskType.REACTION_COLOR_SWITCH];
     type = types[Math.floor(Math.random() * types.length)];
  } else if (category === TaskCategory.LANGUAGE) {
     const types = [TaskType.LANG_ODD_ONE_OUT, TaskType.LANG_CONNECT];
     type = types[Math.floor(Math.random() * types.length)];
  } else {
     const types = [TaskType.MUSIC_RHYTHM, TaskType.MUSIC_MEMORY];
     type = types[Math.floor(Math.random() * types.length)];
  }

  // Current Level
  let level = userStats.levels[type] || 1;
  
  // Generate Content
  let taskContent: Partial<TaskData> = {};

  if (category === TaskCategory.MATH) {
    if (type === TaskType.MATH_SEQUENCE) {
        taskContent = generateMathSequenceTask(level);
    } else if (type === TaskType.MATH_STREAM) {
        // Fallback for old type if selected
        taskContent = { question: "Math Stream", content: { startValue: 10, defaultSpeed: 2000, defaultOps: ['+'] }, solution: 0 };
    } else {
        // NEW FLOW MATH
        taskContent = generateFlowMathTask(type, level);
    }
  } else if (category === TaskCategory.REACTION) {
    taskContent = generateReactionTask(type, level);
  } else if (category === TaskCategory.MUSIC) {
    taskContent = generateMusicTask(type, level);
  } else if (category === TaskCategory.LANGUAGE) {
    const content = await generateLanguageTaskContent(type, level);
    taskContent = {
        question: type === TaskType.LANG_CONNECT ? "Verbinde Wörter" : "Was passt nicht?",
        content,
        solution: "index"
    };
  }

  return {
    id,
    category,
    type,
    difficultyLevel: level,
    question: taskContent.question || "Task",
    content: taskContent.content,
    solution: taskContent.solution,
    generatedAt: Date.now()
  };
};

// --- STATS UPDATE LOGIC ---

export const updateStats = (currentStats: UserStats, result: TaskResult): { newStats: UserStats, decision: string } => {
  const newStats = { ...currentStats };
  newStats.history = [...newStats.history, result];
  newStats.totalTimeMs += result.timeSpentMs;

  const type = result.type;
  let currentLevel = newStats.levels[type] || 1;
  let decision = "maintain";

  // --- MATH ADAPTATION: FLOW ZONE (5s - 20s) ---
  if (type === TaskType.MATH_ADDITION || type === TaskType.MATH_SUBTRACTION || type === TaskType.MATH_MULTIPLICATION) {
      
      // 1. Get History for this specific type
      // We use the new history entry we just added
      const typeHistory = newStats.history.filter(h => h.type === type);
      const totalSolved = typeHistory.length;

      // 2. Define Window Size
      // Early phase: Short window (8) for fast calibration
      // Late phase: Long window (15) for stability
      const windowSize = totalSolved < 30 ? 8 : 15;
      const window = typeHistory.slice(-windowSize);

      // Need minimum data to adapt? If < 3 tasks, just keep level.
      // Exception: If first task is extremely fast/slow, we can adapt immediately.
      
      // Calculate Metrics
      const wins = window.filter(h => h.success).length;
      const accuracy = wins / window.length;
      const totalTime = window.reduce((sum, h) => sum + h.timeSpentMs, 0);
      const avgTimeMs = totalTime / window.length;

      // FLOW ZONE PARAMS
      const FLOW_MIN_MS = 5000;  // 5s
      const FLOW_MAX_MS = 20000; // 20s

      // LOGIC
      
      // Condition A: TOO HARD (Struggle)
      // Low accuracy OR very slow average
      if (accuracy < 0.6 || avgTimeMs > (FLOW_MAX_MS * 1.2)) {
          // Decrease level
          // Minimum Level 1 (2 digits)
          currentLevel = Math.max(1, currentLevel - 1);
          decision = "decrease";
      } 
      // Condition B: TOO EASY (Boredom)
      // High accuracy AND very fast
      else if (accuracy >= 0.9 && avgTimeMs < FLOW_MIN_MS) {
          // Increase Level
          // Logic: Early phase -> Check often. Late phase -> Check rarely.
          
          if (totalSolved < 30) {
              // Fast Track
              currentLevel = Math.min(10, currentLevel + 1);
              decision = "increase_fast";
          } else {
              // Stability check: Only every 15 tasks
              if (totalSolved % 15 === 0) {
                  currentLevel = Math.min(10, currentLevel + 1);
                  decision = "increase";
              }
          }
      }
      // Condition C: FLOW ZONE
      // Time is 5-20s, accuracy decent. Do nothing. Maintain Flow.
      
      newStats.levels[type] = currentLevel;
      return { newStats, decision };
  }

  // --- OTHER TASKS (Legacy ELO System for Reaction etc) ---
  
  const currentConfidence = newStats.confidence[type] || 0.1; 
  let volatility = 1 + (1 - currentConfidence) * 2; 
  
  let baseChange = 0;
  if (result.success) {
      if (result.timeSpentMs < 3000) baseChange = 1.0; 
      else if (result.timeSpentMs < 5000) baseChange = 0.6; 
      else if (result.timeSpentMs < 10000) baseChange = 0.3; 
      else baseChange = 0.1; 
  } else if (result.wasSkipped) {
      // Smart Skip
      if (result.timeSpentMs < 1500) baseChange = -0.5; // Too hard/scary
      else baseChange = -0.2; // Boring
  } else {
      baseChange = -0.5; // Fail
  }

  let change = baseChange * volatility;
  let newLevel = currentLevel + change;
  if (newLevel < 1) newLevel = 1;
  
  newStats.levels[type] = Math.round(newLevel * 100) / 100;
  const confGain = result.wasSkipped ? 0.01 : 0.05;
  newStats.confidence[type] = Math.min(1.0, currentConfidence + confGain);

  decision = change > 0 ? "increase_elo" : (change < 0 ? "decrease_elo" : "maintain");

  return { newStats, decision };
};
