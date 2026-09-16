import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Game } from '@/types/game';

const GameContext = createContext<{
  game: Game | null;
  setGame: (game: Game) => void;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null);
  return <GameContext.Provider value={{ game, setGame }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider.');
  return context;
}
