
import React, { useState, useEffect } from 'react';
import { Feed } from './components/Feed';
import { Analytics } from './components/Analytics';
import { UserStats } from './types';
import { INITIAL_STATS, generateUUID, migrateUserStats } from './services/taskEngine';
import { playSound, resumeAudioContext } from './services/audioService';

function App() {
  const [view, setView] = useState<'feed' | 'analytics'>('feed');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpdateInfo, setShowUpdateInfo] = useState(false);
  
  // Load stats with patch for missing userId and new game modes
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('flowScrollStats');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Robust Migration
            return migrateUserStats(parsed);
        } catch (e) {
            return INITIAL_STATS;
        }
    }
    return INITIAL_STATS;
  });

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('flowScrollOnboarding');
    const hasSeenUpdate = localStorage.getItem('flowScroll_v2_seen');
    
    // REMOVED: const hasStats = localStorage.getItem('flowScrollStats'); 
    // We want to show the update info to EVERYONE who hasn't seen it yet, 
    // even if they are technically "new" (no stats) but skipped onboarding or cleared cache.

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    } else if (!hasSeenUpdate) {
        // Show V2 Update Celebration to ALL users who haven't dismissed it
        setShowUpdateInfo(true);
        setTimeout(() => playSound('correct'), 500); // Celebration sound
    }
  }, []);

  // --- AUDIO CONTEXT RECOVERY ---
  // Fixes issues where audio dies after backgrounding on mobile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resumeAudioContext();
      }
    };

    const handleInteraction = () => {
      resumeAudioContext();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('flowScrollStats', JSON.stringify(userStats));
  }, [userStats]);

  const handleDismissOnboarding = () => {
    playSound('tap');
    resumeAudioContext(); // Explicit resume on start
    localStorage.setItem('flowScrollOnboarding', 'true');
    setShowOnboarding(false);
    
    // Optional: If they just finished onboarding, maybe show update info immediately?
    // For now, we let the next reload handle it or just skip it for brand new users to avoid popup fatigue.
    // But based on request "show to everyone", we could set showUpdateInfo(true) here too, 
    // but the current logic allows it to show on next load or if logic falls through.
    // Actually, to be safe for the specific request:
    if (!localStorage.getItem('flowScroll_v2_seen')) {
        setShowUpdateInfo(true);
    }
  };

  const handleDismissUpdate = () => {
      playSound('tap');
      localStorage.setItem('flowScroll_v2_seen', 'true');
      setShowUpdateInfo(false);
  };

  return (
    <div 
        className="h-full w-full relative bg-black font-sans"
        style={{ '--footer-height': 'calc(60px + env(safe-area-inset-bottom))' } as React.CSSProperties}
    >
      
      {/* Main Content Area */}
      <main className="h-full w-full pb-0 relative overflow-hidden"> 
        {/* CRITICAL CHANGE: We keep Feed mounted but hide it with CSS to preserve state and scroll position */}
        <div className={`h-full w-full ${view === 'feed' ? 'block' : 'hidden'}`}>
             <Feed 
               userStats={userStats}
               setUserStats={setUserStats}
               isPaused={view !== 'feed' || showOnboarding || showUpdateInfo}
             />
        </div>

        {view === 'analytics' && (
             <div className="h-full w-full animate-fade-in pt-[calc(env(safe-area-inset-top)+1rem)]">
                <Analytics userStats={userStats} />
             </div>
        )}
      </main>

      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4">
                FlowScroll
            </h1>
            <p className="text-xl text-white mb-8 max-w-xs leading-relaxed">
                Endlose Mikro-Tasks für deinen <span className="font-bold text-cyan-300">Flow State</span>.
            </p>
            
            <div className="space-y-4 text-sm text-gray-400 mb-12 text-left max-w-xs">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">👆</span> 
                    <span>Swipe hoch zum Überspringen</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🧠</span> 
                    <span>Der Algorithmus lernt dein Level</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎧</span> 
                    <span>Ton an für Rhythmus-Tasks</span>
                </div>
            </div>

            <button 
                onClick={handleDismissOnboarding}
                className="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
                Flow Starten
            </button>
        </div>
      )}

      {/* UPDATE V2 CELEBRATION OVERLAY */}
      {showUpdateInfo && !showOnboarding && (
          <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-hidden">
              {/* CSS Confetti Background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {Array.from({ length: 30 }).map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-[fall_3s_linear_infinite]"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-${Math.random() * 20}%`,
                            backgroundColor: ['#F472B6', '#60A5FA', '#34D399', '#FBBF24'][Math.floor(Math.random() * 4)],
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                      />
                  ))}
                  <style>{`
                    @keyframes fall {
                        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                        100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
                    }
                  `}</style>
              </div>

              <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(168,85,247,0.5)] animate-bounce">
                  <span className="text-4xl">🎁</span>
              </div>

              <h1 className="text-3xl font-black text-white mb-2">Update 2.0 ist da!</h1>
              <p className="text-white/60 mb-8">Wir haben FlowScroll komplett überarbeitet.</p>

              <div className="w-full max-w-xs space-y-3 mb-10">
                  <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3 text-left">
                      <span className="text-2xl">🆕</span>
                      <div>
                          <div className="font-bold text-white text-sm">Neue Spiele</div>
                          <div className="text-xs text-white/50">Zahlenreihen, Fokus & Farbwechsel</div>
                      </div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3 text-left">
                      <span className="text-2xl">🧠</span>
                      <div>
                          <div className="font-bold text-white text-sm">Neuer Algorithmus</div>
                          <div className="text-xs text-white/50">Passt sich perfekt deinem Flow an</div>
                      </div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3 text-left">
                      <span className="text-2xl">🇩🇪</span>
                      <div>
                          <div className="font-bold text-white text-sm">Deutsch</div>
                          <div className="text-xs text-white/50">Komplett übersetzt</div>
                      </div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3 text-left">
                      <span className="text-2xl">🐛</span>
                      <div>
                          <div className="font-bold text-white text-sm">Optimiert</div>
                          <div className="text-xs text-white/50">Bugs gefixt & flüssigeres Swipen</div>
                      </div>
                  </div>
              </div>

              <button 
                  onClick={handleDismissUpdate}
                  className="w-full max-w-xs py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                  Los geht's 🚀
              </button>
          </div>
      )}

      {/* Bottom Navigation - COMPACT DESIGN */}
      <nav className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-50 pb-[env(safe-area-inset-bottom)] pt-2">
        <button 
            onClick={() => { playSound('tap'); setView('feed'); }}
            className={`flex flex-col items-center justify-center w-20 py-2 transition-all active:scale-95 ${view === 'feed' ? 'text-cyan-400' : 'text-white/30 hover:text-white/50'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mb-1">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Flow</span>
        </button>

        <button 
            onClick={() => { playSound('tap'); setView('analytics'); }}
            className={`flex flex-col items-center justify-center w-20 py-2 transition-all active:scale-95 ${view === 'analytics' ? 'text-purple-400' : 'text-white/30 hover:text-white/50'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mb-1">
                <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Profil</span>
        </button>
      </nav>

    </div>
  );
}

export default App;
