import type { GameSnapshot, ScoreEvent } from '../types/history';

export function groupHistory(events: ScoreEvent[]): ScoreEvent[][] {
  const groups = new Map<string, ScoreEvent[]>();
  for (const event of events) {
    const group = groups.get(event.batchId) ?? [];
    group.push(event);
    groups.set(event.batchId, group);
  }
  return [...groups.values()];
}

// Replay the immutable chronological audit log, including Undo/Redo/Restore.
// Mutable action state is deliberately ignored: it describes today's undo stack.
export function getHistoryPoint(snapshot: Pick<GameSnapshot, 'game' | 'events'>, eventId: number) {
  const selected = snapshot.events.find((event) => event.id === eventId);
  if (!selected) return null;
  const endpoint = snapshot.events.reduce((id, event) => event.batchId === selected.batchId ? Math.max(id, event.id) : id, eventId);
  const scores = new Map(snapshot.game.players.map((player) => [player.id, snapshot.game.startingScore]));
  for (const event of [...snapshot.events].sort((a, b) => a.id - b.id)) {
    if (event.id <= endpoint) scores.set(event.playerId, event.newScore);
  }
  return { endpoint, scores };
}
