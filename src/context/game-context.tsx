import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { useSettings } from '@/context/settings-context';
import { applyScoreChange, getScoreChangeError } from '@/services/scoring';
import type { Game } from '@/types/game';
import type { ScoreChangeMethod } from '@/types/scoring';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';

const GameContext = createContext<{
  game: Game | null;
  setGame: (game: Game) => void;
  changeScore: (playerId: string, amount: number, method?: ScoreChangeMethod) => void;
  scoreError: string | null;
  layout: ScoreboardLayout;
  setLayout: (layout: ScoreboardLayout) => void;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [{ game, scoreError }, setState] = useState<{ game: Game | null; scoreError: string | null }>({ game: null, scoreError: null });
  const { allowNegativeScores } = useSettings();
  const [layout, setLayout] = useState<ScoreboardLayout>('grid');
  const setGame = useCallback((next: Game) => setState({ game: next, scoreError: null }), []);
  const changeScore = useCallback((playerId: string, amount: number, method: ScoreChangeMethod = 'preset') => {
    setState((current) => {
      const player = current.game?.players.find((item) => item.id === playerId);
      const error = player ? getScoreChangeError(player.score, amount, method) : 'This player is no longer available.';
      return {
        game: error ? current.game : applyScoreChange(current.game, playerId, amount, method, allowNegativeScores),
        scoreError: error,
      };
    });
  }, [allowNegativeScores]);

  return (
    <GameContext.Provider value={{ game, setGame, changeScore, scoreError, layout, setLayout }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider.');
  return context;
}
