import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { applyScoreChange } from '@/services/scoring';
import type { Game } from '@/types/game';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';

const GameContext = createContext<{
  game: Game | null;
  setGame: (game: Game) => void;
  changeScore: (playerId: string, amount: number) => void;
  layout: ScoreboardLayout;
  setLayout: (layout: ScoreboardLayout) => void;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null);
  const [layout, setLayout] = useState<ScoreboardLayout>('grid');
  const changeScore = useCallback((playerId: string, amount: number) => {
    setGame((current) => applyScoreChange(current, playerId, amount));
  }, []);

  return (
    <GameContext.Provider value={{ game, setGame, changeScore, layout, setLayout }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider.');
  return context;
}
