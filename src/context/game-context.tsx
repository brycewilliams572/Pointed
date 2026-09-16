import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { useSettings } from '@/context/settings-context';
import { getGameRepository } from '@/services/database/database';
import { GameOperationError, type GameRepository } from '@/services/database/game-repository';
import { ScoreService } from '@/services/scoring';
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
  changeScore: (playerId: string, amount: number, method?: ScoreChangeMethod, expectedScore?: number) => Promise<boolean>;
  setLayout: (layout: ScoreboardLayout) => Promise<void>;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  restoreHistory: (eventId: number) => Promise<boolean>;
  deleteGame: (id: string) => Promise<boolean>;
  canUndo: boolean;
  canRedo: boolean;
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
  const selectionVersion = useRef(0);
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

  const openGame = useCallback(async (id: string) => {
    const version = ++selectionVersion.current;
    selectedId.current = id;
    setSnapshot((current) => current?.game.id === id ? current : null);
    setLoadingGame(true);
    setScoreError(null);
    try {
      const repository = await getGameRepository();
      const next = await repository.loadGame(id);
      if (selectionVersion.current === version) setSnapshot(next);
      return true;
    } catch (error) {
      if (selectionVersion.current === version) setScoreError(messageFor(error, 'This game could not be loaded. Please try again.'));
      return false;
    } finally {
      if (selectionVersion.current === version) setLoadingGame(false);
    }
  }, []);

  const createGame = useCallback(async (draft: Pick<Game, 'name' | 'players'>) => {
    setPendingCount((count) => count + 1);
    setScoreError(null);
    try {
      const repository = await getGameRepository();
      const next = await repository.createGame(draft);
      selectionVersion.current++;
      selectedId.current = next.game.id;
      setLoadingGame(false);
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
    if (selectedId.current !== id) return false;
    const version = selectionVersion.current;
    setPendingCount((count) => count + 1);
    setScoreError(null);
    try {
      const next = await work(await getGameRepository());
      if (selectionVersion.current === version) setSnapshot(next);
      return true;
    } catch (error) {
      if (selectionVersion.current === version) setScoreError(messageFor(error, 'The change could not be saved. Your previous saved score is unchanged. Try again.'));
      return false;
    } finally {
      setPendingCount((count) => count - 1);
    }
  }, []);

  const game = snapshot?.game ?? null;
  const changeScore = useCallback(async (playerId: string, amount: number, method: ScoreChangeMethod = 'preset', expectedScore?: number) => {
    if (!game) return false;
    return mutate(game.id, (repository) => new ScoreService(repository).changeScore(game.id, playerId, amount, method, allowNegativeScores, expectedScore));
  }, [game, allowNegativeScores, mutate]);

  const setLayout = useCallback(async (layout: ScoreboardLayout) => {
    if (game) await mutate(game.id, (repository) => repository.setLayout(game.id, layout));
  }, [game, mutate]);

  const historyAction = useCallback(async (action: 'undo' | 'redo' | 'restore', eventId?: number) => {
    if (!game || undoInFlight.current) return false;
    undoInFlight.current = true;
    try {
      return await mutate(game.id, (repository) => {
        const service = new ScoreService(repository);
        return action === 'restore' ? service.restoreHistory(game.id, eventId!) : service[action](game.id);
      });
    } finally {
      undoInFlight.current = false;
    }
  }, [game, mutate]);

  const undo = useCallback(() => historyAction('undo'), [historyAction]);
  const redo = useCallback(() => historyAction('redo'), [historyAction]);
  const restoreHistory = useCallback((eventId: number) => historyAction('restore', eventId), [historyAction]);
  const deleteGame = useCallback(async (id: string) => {
    setPendingCount((count) => count + 1);
    setGamesError(null);
    try {
      await (await getGameRepository()).deleteGame(id);
      if (selectedId.current === id) {
        selectionVersion.current++;
        selectedId.current = null;
        setSnapshot(null);
        setScoreError(null);
        setLoadingGame(false);
      }
      setActiveGames((games) => games.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      setGamesError(messageFor(error, 'The game could not be deleted. Please try again.'));
      return false;
    } finally {
      setPendingCount((count) => count - 1);
    }
  }, []);

  return (
    <GameContext.Provider value={{
      game, events: snapshot?.events ?? [], activeGames, gamesLoading, gamesError,
      loadingGame, saving: pendingCount > 0, scoreError, layout: game?.layout ?? 'grid',
      refreshGames, createGame, openGame, changeScore, setLayout, undo, redo, restoreHistory, deleteGame,
      canUndo: snapshot?.canUndo ?? false, canRedo: snapshot?.canRedo ?? false,
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
