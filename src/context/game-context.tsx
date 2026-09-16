import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useSettings } from '@/context/settings-context';
import { getGameRepository } from '@/services/database/database';
import { GameOperationError, type GameRepository } from '@/services/database/game-repository';
import type { Game } from '@/types/game';
import type { GameSnapshot, GameSummary, SavedGame, ScoreEvent } from '@/types/history';
import type { ScoreChangeMethod } from '@/types/scoring';
import type { ScoreboardLayout } from '@/utils/scoreboard-layout';

type GameContextValue = {
  game: SavedGame | null;
  events: ScoreEvent[];
  activeGames: GameSummary[];
  gamesLoading: boolean;
  gamesError: string | null;
  loadingGame: boolean;
  saving: boolean;
  scoreError: string | null;
  layout: ScoreboardLayout;
  refreshGames: () => Promise<void>;
  createGame: (draft: Pick<Game, 'name' | 'players'>) => Promise<string | null>;
  openGame: (id: string) => Promise<boolean>;
  changeScore: (playerId: string, amount: number, method?: ScoreChangeMethod) => Promise<boolean>;
  setLayout: (layout: ScoreboardLayout) => Promise<void>;
  undo: () => Promise<boolean>;
};

const GameContext = createContext<GameContextValue | null>(null);

function messageFor(error: unknown, fallback: string) {
  if (error instanceof GameOperationError) return error.message;
  if (__DEV__) console.error('Pointed local database operation failed:', error);
  return fallback;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [activeGames, setActiveGames] = useState<GameSummary[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [loadingGame, setLoadingGame] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const selectedId = useRef<string | null>(null);
  const undoInFlight = useRef(false);
  const { allowNegativeScores } = useSettings();

  const refreshGames = useCallback(async () => {
    setGamesLoading(true);
    setGamesError(null);
    try {
      const repository = await getGameRepository();
      setActiveGames(await repository.listGames());
    } catch (error) {
      setGamesError(messageFor(error, 'Saved games could not be loaded. Please try again.'));
    } finally {
      setGamesLoading(false);
    }
  }, []);

  useEffect(() => { void refreshGames(); }, [refreshGames]);

  const openGame = useCallback(async (id: string) => {
    selectedId.current = id;
    setSnapshot(null);
    setLoadingGame(true);
    setScoreError(null);
    try {
      const repository = await getGameRepository();
      const next = await repository.loadGame(id);
      if (selectedId.current === id) setSnapshot(next);
      return true;
    } catch (error) {
      if (selectedId.current === id) setScoreError(messageFor(error, 'This game could not be loaded. Please try again.'));
      return false;
    } finally {
      if (selectedId.current === id) setLoadingGame(false);
    }
  }, []);

  const createGame = useCallback(async (draft: Pick<Game, 'name' | 'players'>) => {
    setPendingCount((count) => count + 1);
    setScoreError(null);
    try {
      const repository = await getGameRepository();
      const next = await repository.createGame(draft);
      selectedId.current = next.game.id;
      setSnapshot(next);
      return next.game.id;
    } catch (error) {
      setScoreError(messageFor(error, 'The game could not be saved. Your player setup is still here. Try again.'));
      return null;
    } finally {
      setPendingCount((count) => count - 1);
    }
  }, []);

  const mutate = useCallback(async (id: string, work: (repository: GameRepository) => Promise<GameSnapshot>) => {
    setPendingCount((count) => count + 1);
    setScoreError(null);
    try {
      const next = await work(await getGameRepository());
      if (selectedId.current === id) setSnapshot(next);
      return true;
    } catch (error) {
      if (selectedId.current === id) setScoreError(messageFor(error, 'The change could not be saved. Your previous saved score is unchanged. Try again.'));
      return false;
    } finally {
      setPendingCount((count) => count - 1);
    }
  }, []);

  const game = snapshot?.game ?? null;
  const changeScore = useCallback(async (playerId: string, amount: number, method: ScoreChangeMethod = 'preset') => {
    if (!game) return false;
    return mutate(game.id, (repository) => repository.changeScore(game.id, playerId, amount, method, allowNegativeScores));
  }, [game, allowNegativeScores, mutate]);

  const setLayout = useCallback(async (layout: ScoreboardLayout) => {
    if (game) await mutate(game.id, (repository) => repository.setLayout(game.id, layout));
  }, [game, mutate]);

  const undo = useCallback(async () => {
    if (!game || undoInFlight.current) return false;
    undoInFlight.current = true;
    try {
      return await mutate(game.id, (repository) => repository.undo(game.id));
    } finally {
      undoInFlight.current = false;
    }
  }, [game, mutate]);

  return (
    <GameContext.Provider value={{
      game, events: snapshot?.events ?? [], activeGames, gamesLoading, gamesError,
      loadingGame, saving: pendingCount > 0, scoreError, layout: game?.layout ?? 'grid',
      refreshGames, createGame, openGame, changeScore, setLayout, undo,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider.');
  return context;
}
