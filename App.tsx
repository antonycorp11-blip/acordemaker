
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CHORDS, LEVELS, MOTIVATIONAL_MESSAGES, STRINGS, FRET_COUNT } from './constants';
import { GameLevel, FingerPosition, Position, ChordDefinition, StringNumber } from './types';
import { supabase } from './supabase';

// Utility for theme classes
const t = (theme: 'dark' | 'light', darkClass: string, lightClass: string) =>
  theme === 'dark' ? darkClass : lightClass;

// Helper to shuffle array
const shuffle = (array: string[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  // Game States
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [placedFingers, setPlacedFingers] = useState<FingerPosition[]>([]);
  const [history, setHistory] = useState<FingerPosition[][]>([]);
  const [chordQueue, setChordQueue] = useState<string[]>([]);
  const [currentChordKey, setCurrentChordKey] = useState('E');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ status: 'idle' | 'correct' | 'incorrect', message: string }>({
    status: 'idle',
    message: ''
  });

  // Supabase & Auth State (ACORDE GALLERY INTEGRATION)
  const [playerInfo, setPlayerInfo] = useState<{ id: string, name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Hints State
  const [hintsLeft, setHintsLeft] = useState(3);
  const [showHint, setShowHint] = useState(false);

  // Barre Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ string: StringNumber, fret: number } | null>(null);

  const currentChord = CHORDS[currentChordKey];
  const timerRef = useRef<number | null>(null);

  // PHYSICAL ORIENTATION: Mizão (6) on top, Mizinha (1) at bottom
  const renderStrings = useMemo(() => [...STRINGS].reverse() as StringNumber[], []);

  // --- REQUIREMENT 1 & 2: SLAVE MODE & AUTO-LOGIN ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlPin = params.get('pin');

        if (!urlPin) {
          setIsLocked(true);
          return;
        }

        // Validação no Banco Mestre (Tabela players)
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('recovery_pin', urlPin)
          .single();

        if (data && !error) {
          // Sucesso: Jogador validado
          console.log("Acesso concedido:", data.name);
          setPlayerInfo(data);
          setIsLocked(false);
        } else {
          console.error("PIN Inválido ou Jogador não encontrado");
          setIsLocked(true);
        }
      } catch (err) {
        console.error("Erro fatal na conexão:", err);
        setIsLocked(true);
      } finally {
        // CRÍTICO: Garante que o estado de "Loading" termine SEMPRE
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // --- REQUIREMENT 3: SAVE PROGRESS ON GAME OVER ---
  useEffect(() => {
    if (gameState === 'gameover' && score > 0) {
      saveProgress();
    }
  }, [gameState]);

  const saveProgress = async () => {
    if (!playerInfo) return;
    setSaveStatus('saving');

    const experienceGained = Math.floor(score / 10);

    try {
      // 1. Log match in game_scores
      const { error: logError } = await supabase
        .from('game_scores')
        .insert({
          player_id: playerInfo.id,
          game_id: 'acorde-maker',
          score: score,
          experience_gained: experienceGained,
          metadata: {
            levelReached: currentLevel
          }
        });

      // 2. Update player stats via RPC (XP Gained)
      const { error: updateError } = await supabase.rpc('increment_player_stats', {
        p_player_id: playerInfo.id,
        p_xp_gain: experienceGained,
        p_coins_gain: 0
      });

      if (logError || updateError) throw logError || updateError;
      setSaveStatus('success');
    } catch (err) {
      console.error('Erro ao sincronizar com a Galeria:', err);
      setSaveStatus('error');
    }
  };

  // AUTO-ADVANCE LOGIC
  useEffect(() => {
    if (gameState !== 'playing' || placedFingers.length === 0) return;

    const isExact = (target: Position[]) => {
      if (placedFingers.length !== target.length) return false;
      return target.every(t =>
        placedFingers.some(f => f.string === t.string && f.fret === t.fret)
      );
    };

    if (isExact(currentChord.positions)) {
      handleSuccess('Excelente!');
    } else if (currentChord.variations?.some(v => isExact(v))) {
      handleSuccess('Boa variação!');
    }
  }, [placedFingers, currentChord, gameState]);

  const handleSuccess = (msg: string) => {
    const levelData = LEVELS.find(l => (l.id as number) === currentLevel) || LEVELS[0];
    const points = levelData.pointsPerChord;

    setFeedback({ status: 'correct', message: `${msg} +${points}` });
    setScore(s => s + points);
    setTimeLeft(prev => prev + 5);

    setTimeout(() => {
      setPlacedFingers([]);
      setHistory([]);
      setFeedback({ status: 'idle', message: '' });
      advanceChord();
    }, 600);
  };

  const advanceChord = () => {
    setChordQueue(prev => {
      if (prev.length <= 1) {
        const currentLevelData = LEVELS.find(l => (l.id as number) === currentLevel) || LEVELS[0];
        const newQueue = shuffle(currentLevelData.chords);
        if (newQueue[0] === currentChordKey && newQueue.length > 1) {
          newQueue.push(newQueue.shift()!);
        }
        setCurrentChordKey(newQueue[0]);
        return newQueue.slice(1);
      }
      const next = prev[0];
      setCurrentChordKey(next);
      return prev.slice(1);
    });
  };

  useEffect(() => {
    const nextLevel = LEVELS.find(l => score >= l.unlockThreshold && (l.id as number) > currentLevel);
    if (nextLevel) {
      const lid = nextLevel.id as number;
      setCurrentLevel(lid);
      const newQueue = shuffle(nextLevel.chords);
      setCurrentChordKey(newQueue[0]);
      setChordQueue(newQueue.slice(1));
    }
  }, [score, currentLevel]);

  const useHint = () => {
    if (hintsLeft <= 0 || showHint || gameState !== 'playing') return;
    setHintsLeft(prev => prev - 1);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 3000);
  };

  const handlePointerDown = (string: StringNumber, fret: number) => {
    if (gameState !== 'playing') return;
    setDragStart({ string, fret });
    setIsDragging(true);
    toggleFinger(string, fret);
  };

  const handlePointerEnter = (string: StringNumber, fret: number) => {
    if (isDragging && dragStart && fret === dragStart.fret) {
      toggleFinger(string, fret);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const toggleFinger = (string: StringNumber, fret: number) => {
    setPlacedFingers(prev => {
      const exists = prev.find(f => f.string === string && f.fret === fret);
      let newFingers;
      if (exists) {
        newFingers = prev.filter(f => !(f.string === string && f.fret === fret));
      } else {
        newFingers = [...prev, { id: Math.random().toString(36).substr(2, 9), string, fret }];
      }
      setHistory(h => [...h, prev]);
      return newFingers;
    });
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPlacedFingers(last);
    setHistory(h => h.slice(0, -1));
  };

  const clearFingers = () => {
    setHistory(h => [...h, placedFingers]);
    setPlacedFingers([]);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(45);
    setPlacedFingers([]);
    setHistory([]);
    setGameState('playing');
    setFeedback({ status: 'idle', message: '' });
    setCurrentLevel(1);
    setHintsLeft(3);
    setShowHint(false);
    const firstLevelChords = LEVELS[0].chords;
    const newQueue = shuffle(firstLevelChords);
    setCurrentChordKey(newQueue[0]);
    setChordQueue(newQueue.slice(1));
  };

  // --- REQUIREMENT 3: BLOCKER SCREEN ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xl font-black uppercase tracking-widest animate-pulse">CARREGANDO...</span>
        </div>
      </div>
    );
  }

  if (isLocked || !playerInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 uppercase tracking-tight">Acesso Restrito via Acorde Gallery</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Este jogo é um módulo oficial da <strong>Acorde Gallery</strong>.<br />
            O acesso via plataforma central é obrigatório.
          </p>
          <a
            href="https://acordegallery.vercel.app"
            className="block w-full py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
          >
            Ir para Acorde Gallery
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 overflow-hidden ${t(theme, 'bg-slate-950 text-white', 'bg-zinc-50 text-slate-900')}`}
      onPointerUp={handlePointerUp}
    >
      <header className={`p-3 md:p-4 flex justify-between items-center border-b sticky top-0 z-50 transition-colors ${t(theme, 'bg-slate-900 border-slate-800 shadow-xl', 'bg-white border-zinc-200 shadow-sm')}`}>
        <div className="flex flex-col">
          <h1 className={`text-lg md:text-xl font-bold ${t(theme, 'text-amber-400', 'text-amber-600')}`}>
            {playerInfo.name.split(' ')[0]}
          </h1>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Acorde Maker Module
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <div className={`text-xl font-mono font-bold leading-none ${timeLeft < 10 ? 'text-red-500 animate-pulse' : t(theme, 'text-white', 'text-slate-900')}`}>
              {timeLeft}s
            </div>
            <div className="text-[8px] text-slate-500 font-bold uppercase">Tempo</div>
          </div>

          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-xl transition-all border ${t(theme, 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700', 'bg-zinc-100 border-zinc-300 text-amber-600 hover:bg-zinc-200')}`}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          <a
            href="https://acordegallery.vercel.app"
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${t(theme, 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white', 'bg-zinc-100 border-zinc-200 text-slate-500 hover:text-slate-900')}`}
          >
            Sair
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {gameState === 'start' && (
          <div className="absolute inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div className={`p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full border ${t(theme, 'bg-slate-900 border-slate-800', 'bg-white border-zinc-200')}`}>
              <div className="text-amber-500 text-5xl mb-4 font-black tracking-tighter italic">BEM-VINDO</div>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium capitalize">O braço está em diagrama técnico: Mizinha (E) à direita. <br />Monte o acorde o mais rápido que puder!</p>
              <button
                onClick={startGame}
                className="w-full py-5 bg-amber-500 text-slate-950 rounded-2xl font-black text-xl hover:bg-amber-400 transition-all active:scale-95 shadow-[0_10px_30px_rgba(245,158,11,0.3)]"
              >
                COMEÇAR DESAFIO
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full transform transition-all ${t(theme, 'bg-slate-900', 'bg-white')}`}>
              <h2 className="text-2xl font-bold mb-2">Fim de Jogo!</h2>
              <div className="text-slate-500 text-sm mb-1 uppercase tracking-widest font-bold">Pontos</div>
              <div className="text-7xl font-black text-amber-500 my-4 drop-shadow-lg">{score}</div>

              {saveStatus === 'saving' && (
                <div className="text-[10px] text-amber-500 animate-pulse font-bold uppercase mb-4 tracking-widest">Sincronizando com a Galeria...</div>
              )}
              {saveStatus === 'success' && (
                <div className="text-[10px] text-emerald-500 font-bold uppercase mb-4 flex items-center justify-center gap-1 tracking-widest">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  Progresso Salvo na Galeria!
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="text-[10px] text-red-500 font-bold uppercase mb-4 tracking-widest">Erro ao salvar na Galeria.</div>
              )}

              <p className="text-slate-400 text-sm mb-8">Ótima evolução! XP ganho: +{Math.floor(score / 10)}</p>
              <button onClick={startGame} className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-bold text-xl hover:bg-amber-400 transition-all active:scale-95">Jogar de Novo</button>
            </div>
          </div>
        )}

        <div className="text-center mb-4 mt-2 w-full">
          <div className="flex items-center justify-center gap-2 mb-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Monte este acorde</span>
          </div>
          <h2 className="text-7xl font-black mb-1 tracking-tighter drop-shadow-sm">{currentChordKey}</h2>
          <p className="text-slate-500 text-sm font-semibold">{currentChord.name}</p>

          <div className="max-w-[200px] mx-auto mt-4 mb-2">
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${t(theme, 'bg-slate-800', 'bg-zinc-200')}`}>
              <div
                className="h-full bg-amber-500 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{
                  width: `${Math.min(100, (placedFingers.filter(f =>
                    currentChord.positions.some(p => p.string === f.string && p.fret === f.fret)
                  ).length / currentChord.positions.length) * 100)}%`
                }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[8px] font-bold text-slate-500 uppercase">Progresso</span>
              <span className="text-[8px] font-bold text-amber-500">{placedFingers.filter(f => currentChord.positions.some(p => p.string === f.string && p.fret === f.fret)).length}/{currentChord.positions.length}</span>
            </div>
          </div>

          <div className={`mt-3 text-[11px] px-5 py-2 rounded-full inline-block border transition-colors ${t(theme, 'bg-slate-800 border-slate-700 text-slate-400', 'bg-zinc-100 border-zinc-200 text-slate-600')}`}>
            {currentChord.description}
          </div>
        </div>

        <div className={`relative rounded-[2rem] p-6 shadow-2xl border transition-all fret-board-container ${t(theme, 'bg-slate-900 border-slate-800', 'bg-white border-zinc-200')}`}>
          <div className="flex justify-between w-56 mb-3 px-2 mx-auto">
            {renderStrings.map(s => {
              const isUnmuted = currentChord.unmutedStrings.includes(s);
              return (
                <div key={s} className={`text-sm font-bold w-6 text-center ${isUnmuted ? 'text-emerald-500' : 'text-red-500/40'}`}>
                  {isUnmuted ? '○' : '×'}
                </div>
              )
            })}
          </div>

          <div className="w-56 h-[380px] relative flex flex-col mx-auto">
            <div className={`h-4 rounded-t-xl w-full shrink-0 z-20 shadow-md ${t(theme, 'bg-slate-500', 'bg-slate-300')}`}></div>

            <div className="flex-1 flex flex-col relative touch-none">
              {Array.from({ length: FRET_COUNT }).map((_, i) => (
                <div key={i} className={`flex-1 border-b relative flex justify-between transition-colors ${t(theme, 'border-slate-800', 'border-zinc-200')}`}>
                  <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold font-mono">{i + 1}</span>

                  {(i + 1 === 3 || i + 1 === 5) && (
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full opacity-30 ${t(theme, 'bg-slate-600', 'bg-zinc-300')}`}></div>
                  )}

                  {renderStrings.map((string) => {
                    const visualIndex = renderStrings.indexOf(string);
                    return (
                      <div
                        key={`${string}-${i + 1}`}
                        className="absolute z-40 transition-colors hover:bg-amber-500/5 active:bg-amber-500/10 cursor-pointer"
                        style={{ left: `${visualIndex * 16.6}%`, width: '16.6%', top: 0, height: '100%' }}
                        onPointerDown={() => handlePointerDown(string, i + 1)}
                        onPointerEnter={() => handlePointerEnter(string, i + 1)}
                      />
                    );
                  })}
                </div>
              ))}

              {renderStrings.map((string) => {
                const visualIndex = renderStrings.indexOf(string);
                const thickness = 1 + (string - 1) * 0.8;
                return (
                  <div key={string} className={`absolute top-0 bottom-0 shadow-sm z-10 pointer-events-none transition-opacity ${t(theme, 'bg-slate-400 opacity-80', 'bg-slate-500 opacity-90')}`}
                    style={{ width: `${thickness}px`, left: `${visualIndex * 16.6 + 8.3}%` }}
                  />
                );
              })}

              {showHint && currentChord.positions.map((pos, idx) => (
                <div key={`hint-${idx}`} className="absolute z-30 w-8 h-8 -ml-[16px] -mt-[16px] bg-amber-500/30 rounded-full border-2 border-amber-500/50 animate-pulse transition-all pointer-events-none"
                  style={{ top: `${(pos.fret - 0.5) * (100 / FRET_COUNT)}%`, left: `${renderStrings.indexOf(pos.string) * 16.6 + 8.3}%` }}
                />
              ))}

              {placedFingers.map((finger) => {
                const visualIndex = renderStrings.indexOf(finger.string);
                return (
                  <div key={finger.id} className="absolute z-50 w-8 h-8 -ml-[16px] -mt-[16px] bg-amber-500 rounded-full shadow-[0_5px_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-slate-900 font-black border-4 border-white transition-all transform scale-100 animate-in zoom-in-50"
                    style={{ top: `${(finger.fret - 0.5) * (100 / FRET_COUNT)}%`, left: `${visualIndex * 16.6 + 8.3}%` }}
                  >
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center px-4 min-h-[30px]">
          {feedback.status === 'correct' ? (
            <div className="text-emerald-500 font-black animate-bounce text-2xl tracking-tight">
              {feedback.message} <span className="text-sm">+5s</span>
            </div>
          ) : (
            <div className="text-slate-400 italic text-sm font-medium uppercase tracking-tight">
              "{MOTIVATIONAL_MESSAGES[score % MOTIVATIONAL_MESSAGES.length]}"
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 w-full max-w-sm flex gap-2">
          <button onClick={undo} disabled={history.length === 0} className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border flex items-center justify-center gap-2 ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : ''} ${t(theme, 'bg-slate-800 border-slate-700 text-white', 'bg-zinc-200 border-zinc-300 text-slate-900')}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
            Desfazer
          </button>

          <button onClick={useHint} disabled={hintsLeft <= 0 || showHint || gameState !== 'playing'} className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border flex flex-col items-center justify-center relative overflow-hidden ${hintsLeft <= 0 || showHint ? 'opacity-30 cursor-not-allowed' : t(theme, 'bg-slate-800 border-slate-700 text-amber-500', 'bg-zinc-200 border-zinc-300 text-amber-600')}`}>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
              <span>Dica</span>
            </div>
            <div className="text-[9px] uppercase font-black opacity-60">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={i < hintsLeft ? 'text-amber-500' : 'text-slate-500'}>●</span>
              ))}
            </div>
          </button>

          <button onClick={clearFingers} className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border flex items-center justify-center gap-2 ${t(theme, 'bg-slate-800 border-slate-700 text-red-400', 'bg-zinc-200 border-zinc-300 text-red-600')}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            Resetar
          </button>
        </div>
      </main>

      <footer className={`p-4 text-center text-[10px] uppercase tracking-widest transition-colors ${t(theme, 'text-slate-700', 'text-slate-400')}`}>
        {playerInfo.name} • Master Database Connected
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        .fret-board-container::-webkit-scrollbar { display: none; }
        .fret-board-container { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes zoom-in-50 {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-in { animation-duration: 0.2s; animation-fill-mode: both; }
        .zoom-in-50 { animation-name: zoom-in-50; }
      `}} />
    </div>
  );
}
