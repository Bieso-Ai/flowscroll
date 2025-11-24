
import React, { useState } from 'react';
import { UserStats, TaskType } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Props {
  userStats: UserStats;
}

const LEGACY_TYPES = [
    'LANG_SENTENCE', 
    'LANG_RHYME', 
    'LANG_SYNONYM', 
    'MUSIC_RHYTHM'
];

export const Analytics: React.FC<Props> = ({ userStats }) => {
  const [historyLimit, setHistoryLimit] = useState(20);

  // Calculate Brain Level (Sum of all levels)
  const totalLevel = (Object.values(userStats.levels) as number[]).reduce((a, b) => a + b, 0);
  const brainLevel = Math.floor(totalLevel * 10) / 10; // 1 decimal

  // Process history for charts with dynamic limit
  const historySlice = userStats.history.slice(-historyLimit);
  const historyData = historySlice.map((h, i) => ({
    name: i + 1,
    difficulty: h.difficultyLevel,
    time: h.timeSpentMs / 1000,
    success: h.success ? 1 : 0
  }));

  // Filter out legacy types for the Skill Profile
  const levelData = Object.keys(userStats.levels)
    .filter(key => !LEGACY_TYPES.includes(key))
    .map(key => ({
        name: key.replace('MATH_', 'M:').replace('LANG_', 'S:').replace('REACTION_', 'R:').replace('MUSIC_', 'Mu:').replace('FREE_MIND_', 'E:'),
        level: userStats.levels[key as TaskType]
    }));

  return (
    <div className="h-full w-full bg-gray-900 text-white overflow-y-auto p-6 pb-24">
      
      {/* --- PROFILE HEADER --- */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-1 shadow-xl shadow-cyan-500/20 mb-4">
            <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white/80">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Gehirn-Athlet</h1>
        <div className="mt-2 px-4 py-1 bg-white/10 rounded-full text-sm font-mono text-cyan-300 border border-cyan-500/30">
            Brain Level: <span className="font-bold text-white">{brainLevel}</span>
        </div>
      </div>

      {/* --- BASIC STATS CARDS --- */}
      <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20 flex flex-col items-center">
            <div className="text-3xl font-bold text-blue-400">{userStats.history.length}</div>
            <div className="text-xs text-blue-200/60 uppercase tracking-widest mt-1">Tasks Gelöst</div>
            </div>
            <div className="bg-purple-900/20 p-4 rounded-2xl border border-purple-500/20 flex flex-col items-center">
            <div className="text-3xl font-bold text-purple-400">{Math.floor(userStats.totalTimeMs / 1000 / 60)}<span className="text-sm text-white/50 ml-1">min</span></div>
            <div className="text-xs text-purple-200/60 uppercase tracking-widest mt-1">Flow Zeit</div>
            </div>
      </div>

      <div className="grid gap-8">
        
        {/* --- SKILL LEVELS --- */}
        <div className="bg-gray-800/50 p-4 rounded-2xl shadow-lg border border-white/5">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Skill Profil</h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} interval={0} tick={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="level" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- FLOW ZONE CHART --- */}
        <div className="bg-gray-800/50 p-4 rounded-2xl shadow-lg border border-white/5">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Flow Zone</h2>
             <div className="flex bg-black/30 rounded-lg p-1 gap-1">
                {[10, 20, 50, 100].map(limit => (
                    <button
                        key={limit}
                        onClick={() => setHistoryLimit(limit)}
                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                            historyLimit === limit 
                            ? 'bg-cyan-600 text-white' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        {limit}
                    </button>
                ))}
             </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#4B5563" fontSize={10} tick={false} />
                <YAxis yAxisId="left" stroke="#8884d8" fontSize={10} width={30} />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={10} width={30} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="difficulty" stroke="#8884d8" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                <Line yAxisId="right" type="monotone" dataKey="time" stroke="#82ca9d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs font-mono">
                <div className="flex items-center gap-1 text-purple-400">
                    <div className="w-2 h-2 rounded-full bg-purple-400" /> Schwierigkeit
                </div>
                <div className="flex items-center gap-1 text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400" /> Zeit (s)
                </div>
          </div>
        </div>

        {/* --- BETA FEEDBACK SECTION --- */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 rounded-2xl shadow-lg border border-white/10 mb-8 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Beta Tester?</h3>
            <p className="text-sm text-purple-200 mb-4">Fehler gefunden? Level 5 zu schwer? Sag uns Bescheid um den Algorithmus zu verbessern.</p>
            <a 
                href={`mailto:bieso.contact@gmail.com?subject=FlowScroll Beta Feedback&body=Mein Brain Level: ${brainLevel}%0D%0ATotal Tasks: ${userStats.history.length}%0D%0A%0D%0AFeedback:`}
                className="inline-block w-full py-3 bg-white text-purple-900 font-bold rounded-xl hover:scale-105 transition-transform"
            >
                Feedback Senden
            </a>
        </div>

        {/* --- DATA RECOVERY SECTION --- */}
        <div className="text-center border-t border-white/10 pt-6 pb-8 space-y-4">
            <div className="bg-black/30 p-3 rounded-lg inline-block max-w-full overflow-hidden">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Deine User ID (für Support)</p>
                <code className="text-xs text-cyan-500 font-mono select-all block truncate max-w-[200px] mx-auto">
                    {userStats.userId}
                </code>
                <button 
                    onClick={() => navigator.clipboard.writeText(userStats.userId)}
                    className="text-[10px] text-gray-400 hover:text-white mt-1 underline"
                >
                    ID Kopieren
                </button>
            </div>

            <div className="flex justify-center gap-6 text-xs text-gray-500">
                <a 
                    href="https://dein-impressum.de/bieso" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                >
                    Impressum
                </a>
                <span className="text-gray-700">|</span>
                <span className="cursor-help hover:text-white transition-colors" title="Daten werden lokal gespeichert und anonym zur Verbesserung gesendet.">
                    Datenschutz
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};
