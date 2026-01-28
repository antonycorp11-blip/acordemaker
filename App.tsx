
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CHORDS, LEVELS, MOTIVATIONAL_MESSAGES, STRINGS, FRET_COUNT } from './constants';
import { GameLevel, FingerPosition, Position, ChordDefinition, StringNumber } from './types';

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
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ status: 'idle' | 'correct' | 'incorrect', message: string }>({
    status: 'idle',
    message: ''
  });

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
    setTimeLeft(prev => prev + 5); // Relaxed bonus: +5s

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
        // Avoid starting the new queue with the chord we just played
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

  // Level Progression Logic
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

  // Finger Action with History
  const pushToHistory = (newFingers: FingerPosition[]) => {
    setHistory(prev => [...prev, placedFingers]);
    setPlacedFingers(newFingers);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPlacedFingers(last);
    setHistory(prev => prev.slice(0, -1));
  };

  const clearFingers = () => {
    if (placedFingers.length === 0) return;
    setHistory(prev => [...prev, placedFingers]);
    setPlacedFingers([]);
  };

  const toggleFinger = (string: StringNumber, fret: number) => {
    const exists = placedFingers.find(f => f.string === string && f.fret === fret);
    let newFingers: FingerPosition[];

    if (exists) {
      newFingers = placedFingers.filter(f => !(f.string === string && f.fret === fret));
    } else {
      // Remove other fingers on same string
      const filtered = placedFingers.filter(f => f.string !== string);
      newFingers = [...filtered, { id: Math.random().toString(36), string, fret }];
    }
    pushToHistory(newFingers);
  };

  const applyBarre = (fret: number, startStr: StringNumber, endStr: StringNumber) => {
    const min = Math.min(startStr, endStr) as StringNumber;
    const max = Math.max(startStr, endStr) as StringNumber;

    const otherFingers = placedFingers.filter(f => f.string < min || f.string > max);
    const barreFingers: FingerPosition[] = [];
    for (let s = min; s <= max; s++) {
      barreFingers.push({ id: `barre-${s}-${fret}`, string: s as StringNumber, fret });
    }
    pushToHistory([...otherFingers, ...barreFingers]);
  };

  const handlePointerDown = (string: StringNumber, fret: number) => {
    if (gameState !== 'playing') return;
    setIsDragging(true);
    setDragStart({ string, fret });
    toggleFinger(string, fret);
  };

  const handlePointerEnter = (string: StringNumber, fret: number) => {
    if (!isDragging || !dragStart || dragStart.fret !== fret) return;
    applyBarre(fret, dragStart.string, string);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const useHint = () => {
    if (hintsLeft <= 0 || showHint || gameState !== 'playing') return;
    setHintsLeft(prev => prev - 1);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 3000); // Exibe por 3 segundos
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(45); // Standard Start: 45s
    setPlacedFingers([]);
    setHistory([]);
    setGameState('playing');
    setFeedback({ status: 'idle', message: '' });
    setCurrentLevel(1);
    setHintsLeft(3); // Reset hints
    setShowHint(false);
    const firstLevelChords = LEVELS[0].chords;
    const newQueue = shuffle(firstLevelChords);
    setCurrentChordKey(newQueue[0]);
    setChordQueue(newQueue.slice(1));
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 overflow-hidden ${t(theme, 'bg-slate-950 text-white', 'bg-zinc-50 text-slate-900')}`}
      onPointerUp={handlePointerUp}
    >
      <header className={`p-3 md:p-4 flex justify-between items-center border-b sticky top-0 z-50 transition-colors ${t(theme, 'bg-slate-900 border-slate-800 shadow-xl', 'bg-white border-zinc-200 shadow-sm')}`}>
        <div className="flex flex-col">
          <h1 className={`text-lg md:text-xl font-bold ${t(theme, 'text-amber-400', 'text-amber-600')}`}>Construtor de Acordes</h1>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            {LEVELS.find(l => (l.id as number) === currentLevel)?.title || 'Mestria'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className={`text-2xl font-mono font-bold leading-none ${timeLeft < 10 ? 'text-red-500 animate-pulse' : t(theme, 'text-white', 'text-slate-900')}`}>
              {timeLeft}s
            </div>
            <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Tempo</div>
          </div>

          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-full transition-all border ${t(theme, 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700', 'bg-zinc-100 border-zinc-300 text-amber-600 hover:bg-zinc-200')}`}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2" /><path d="M12 21v2" /><path d="m4.22 4.22 1.42 1.42" /><path d="m18.36 18.36 1.42 1.42" /><path d="M1 12h2" /><path d="M21 12h2" /><path d="m4.22 19.78 1.42-1.42" /><path d="m18.36 5.64 1.42-1.42" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 max-w-4xl mx-auto w-full relative overflow-y-auto">
        {gameState === 'start' && (
          <div className="absolute inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
            <div className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full transform transition-all ${t(theme, 'bg-slate-900', 'bg-white')}`}>
              <h2 className="text-3xl font-bold mb-4">Treino Rápido</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Monte o máximo de acordes.<br />
                Acertos dão <span className="text-amber-500 font-bold">+5s</span>.<br />
                O braço está em diagrama técnico.<br />
                Mizinha à direita.
              </p>
              <button onClick={startGame} className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-bold text-xl hover:bg-amber-400 transition-all active:scale-95 shadow-[0_10px_20px_rgba(245,158,11,0.3)]">Começar Agora</button>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full transform transition-all ${t(theme, 'bg-slate-900', 'bg-white')}`}>
              <h2 className="text-2xl font-bold mb-2">Fim de Jogo!</h2>
              <div className="text-slate-500 text-sm mb-1 uppercase tracking-widest font-bold">Pontos</div>
              <div className="text-7xl font-black text-amber-500 my-4 drop-shadow-lg">{score}</div>
              <p className="text-slate-500 text-sm mb-8">Ótima evolução! Continue assim.</p>
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

          {/* Progress Bar of Chord Construction */}
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
          {/* Unmuted/Muted Indicators at Top */}
          <div className="flex justify-between w-56 mb-3 px-2 mx-auto">
            {renderStrings.map(s => {
              const isUnmuted = currentChord.unmutedStrings.includes(s);
              return (
                <div
                  key={s}
                  className={`text-sm font-bold w-6 text-center ${isUnmuted ? 'text-emerald-500' : 'text-red-500/40'}`}
                >
                  {isUnmuted ? '○' : '×'}
                </div>
              )
            })}
          </div>

          <div className="w-56 h-[380px] relative flex flex-col mx-auto">
            {/* The Nut (Top) */}
            <div className={`h-4 rounded-t-xl w-full shrink-0 z-20 shadow-md ${t(theme, 'bg-slate-500', 'bg-slate-300')}`}></div>

            {/* Frets Area (Vertical) */}
            <div className="flex-1 flex flex-col relative touch-none">
              {Array.from({ length: FRET_COUNT }).map((_, i) => (
                <div key={i} className={`flex-1 border-b relative flex justify-between transition-colors ${t(theme, 'border-slate-800', 'border-zinc-200')}`}>
                  <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold font-mono">
                    {i + 1}
                  </span>

                  {/* Fret Markers */}
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

              {/* Strings (Vertical) */}
              {renderStrings.map((string) => {
                const visualIndex = renderStrings.indexOf(string);
                const thickness = 1 + (string - 1) * 0.8;
                return (
                  <div
                    key={string}
                    className={`absolute top-0 bottom-0 shadow-sm z-10 pointer-events-none transition-opacity ${t(theme, 'bg-slate-400 opacity-80', 'bg-slate-500 opacity-90')}`}
                    style={{
                      width: `${thickness}px`,
                      left: `${visualIndex * 16.6 + 8.3}%`,
                    }}
                  />
                );
              })}

              {/* Hint Ghost Fingers */}
              {showHint && currentChord.positions.map((pos, idx) => (
                <div
                  key={`hint-${idx}`}
                  className="absolute z-30 w-8 h-8 -ml-[16px] -mt-[16px] bg-amber-500/30 rounded-full border-2 border-amber-500/50 animate-pulse transition-all pointer-events-none"
                  style={{
                    top: `${(pos.fret - 0.5) * (100 / FRET_COUNT)}%`,
                    left: `${renderStrings.indexOf(pos.string) * 16.6 + 8.3}%`
                  }}
                />
              ))}

              {/* Fingers */}
              {placedFingers.map((finger) => {
                const visualIndex = renderStrings.indexOf(finger.string);
                return (
                  <div
                    key={finger.id}
                    className="absolute z-50 w-8 h-8 -ml-[16px] -mt-[16px] bg-amber-500 rounded-full shadow-[0_5px_15px_rgba(245,158,11,0.5)] flex items-center justify-center text-slate-900 font-black border-4 border-white transition-all transform scale-100 animate-in zoom-in-50"
                    style={{
                      top: `${(finger.fret - 0.5) * (100 / FRET_COUNT)}%`,
                      left: `${visualIndex * 16.6 + 8.3}%`
                    }}
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
            <div className="text-slate-400 italic text-sm font-medium">
              "{MOTIVATIONAL_MESSAGES[score % MOTIVATIONAL_MESSAGES.length]}"
            </div>
          )}
        </div>

        {/* Improved Controls for Correction */}
        <div className="mt-auto pt-4 w-full max-w-sm flex gap-2">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border flex items-center justify-center gap-2 ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : ''} ${t(theme, 'bg-slate-800 border-slate-700 text-white', 'bg-zinc-200 border-zinc-300 text-slate-900')}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
            Desfazer
          </button>

          {/* Hint Button */}
          <button
            onClick={useHint}
            disabled={hintsLeft <= 0 || showHint || gameState !== 'playing'}
            className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border flex flex-col items-center justify-center relative overflow-hidden ${hintsLeft <= 0 || showHint ? 'opacity-30 cursor-not-allowed' : t(theme, 'bg-slate-800 border-slate-700 text-amber-500', 'bg-zinc-200 border-zinc-300 text-amber-600')}`}
          >
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

          <button
            onClick={clearFingers}
            className={`flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 border flex items-center justify-center gap-2 ${t(theme, 'bg-slate-800 border-slate-700 text-red-400', 'bg-zinc-200 border-zinc-300 text-red-600')}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            Resetar
          </button>
        </div>

        <div className={`mt-6 text-[10px] uppercase font-bold tracking-widest transition-opacity ${t(theme, 'text-slate-600', 'text-slate-400')} opacity-60 text-center`}>
          Toque para colocar dedo • Arraste para pestana.<br />
          Mizinha (E) à direita.
        </div>
      </main>

      <footer className={`p-4 text-center text-[10px] uppercase tracking-widest transition-colors ${t(theme, 'text-slate-700', 'text-slate-400')}`}>
        Progressão: {score} Acordes • v2.2
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
