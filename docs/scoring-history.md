# Scoring and history

Pointed keeps all game data in the existing local `pointed.db` SQLite database.
There are no new dependencies or app network calls.

## Pending scoring

Tapping a player opens a native React Native modal. Presets accumulate a signed
pending change in the modal only. Custom Score Change replaces that pending
amount; subsequent presets can adjust it. Set Score switches to an absolute
target and starts with the current score. Switching back starts a fresh delta.

Only Confirm calls ScoreService. Cancel and Android back discard the draft.
Keyboard Done does not commit. Repeated Confirm taps are guarded while saving.
A no-op confirmation creates no event and preserves the existing Redo path.

The existing rules still apply: integer inputs, a maximum absolute input/score of
999,999,999, subtraction clamped to zero when negative totals are disabled, and
negative Set Score rejected unless negative totals are enabled. Undo/Redo and
Restore reproduce stored scores even if the negative-score preference changed.

The modal captures the score it previews. The repository checks this expected
score against SQLite inside the transaction; stale previews fail instead of
silently applying a different result. The user can close and reopen the menu.

## Stable scoreboard

The previous conditional Saving text added/removed a toolbar row on every write,
moving every card. The toolbar now keeps one status line with a constant line
count. Refreshing the same game retains its current snapshot while loading.
Player IDs/order stay stable, and the score text has a reserved height that
scales with system text size. Score-dependent text fitting cannot resize a card.
Editing controls live in the modal rather than in each card.

## Schema version 2

Version 1 games and players remain intact. The migration adds `score_actions`:

| Column | Purpose |
| --- | --- |
| `id` | Autoincrement action ID |
| `game_id` | Owning game, foreign key |
| `state` | `applied`, `undone`, or `abandoned` |
| `undo_order` | Last Undo audit-event ID; determines the Redo stack order |
| `restore_target` | Historical endpoint for a Restore action, otherwise null |

The migration rebuilds `score_events` transactionally, retaining original IDs,
scores, timestamps, and Undo links. It adds:

- `action_id`: the action owning an original score/restore event. Undo/Redo audit
  events have no action ID and link to the original event through `undo_of`.
- `batch_id`: groups all player changes committed by one operation.
- `REDO` and `RESTORE` event types.
- Bounds checks on stored previous/new scores and indexes for actions/batches.

The old uniqueness restriction on `undo_of` is removed: repeated Undo/Redo must
be able to refer to the same original event more than once. Game/player and
game/action composite foreign keys protect ownership.

Existing v1 non-undone actions are migrated into the applied stack. Existing v1
undone actions are archived as abandoned, retaining their audit history and
historical restore points. They do not acquire a speculative Redo path: v1 did
not store one. New Undo/Redo operations are fully persistent after migration.

Initialization still shares one promise. The migration and `user_version = 2`
update commit together, failures roll back, and a newer schema is refused.

## Undo, Redo, and restoration

Undo selects the latest applied action and restores each stored `previous_score`.
Redo selects the most recently undone action and restores each stored `new_score`.
Both verify the current score matches the expected source value, update action
state, and append audit events in the same transaction. Neither guesses inverse
arithmetic. A Restore affecting several players is one Undo/Redo action.

A new confirmed score change or effective Restore marks undone actions abandoned.
This clears the Redo branch without deleting audit history. Applied earlier
actions stay in the undo stack. Undoing a Restore returns the entire game to the
state immediately before it; further Undo continues through earlier actions.

History groups events by batch. Each Restore button selects the state immediately
after that whole batch, never an intermediate player update. The confirmation
lists target scores for all current players.

Historical scores are reconstructed from the starting score and chronological
audit events through the selected endpoint, including Undo/Redo/Restore events.
Current mutable action states are deliberately ignored during replay. This also
allows restoration of a historical state from an abandoned branch.

Restore appends a new action and one event per changed player. It never deletes
old history. If every score already matches, Restore is a no-op and does not clear
Redo. Restoration affects scores only, not player names, colors, or layout.

All operations use the existing shared repository queue and bound SQL parameters.
UI snapshots are published only after commit. A failed event insert rolls back
scores, timestamps, action states, and branch invalidation together.

## Saved Games and deletion

Home's Continue Game action opens `/games`. Saved Games lists games with player
count, activity time, and status; selecting Continue opens their scoreboard.
Score History remains a separate screen within a game.

Delete first shows a confirmation naming the game. Confirmed deletion clears
audit self-references, then removes events, actions, players, and the game in one
transaction with foreign keys enabled. The selected game is cleared from context
if it was deleted. Failure rolls back all deletions.

## Verification and remaining limits

Run `npm run typecheck`, `npm run lint`, and `npm test` (Node 24 is used for the
real SQLite test adapter). Tests cover migration/rollback, batched pending input,
Cancel, duplicate Confirm, all scoring modes, repeated Undo/Redo, disk reload,
multi-player restoration, branch invalidation, deletion rollback, and orphan checks.

Native pixel layout, screen-reader focus, keyboard behavior, and gestures still
need device testing. History remains fully loaded per game; pagination or cached
checkpoints may be useful for very long sessions. Appearance and negative-score
preferences remain session-only. There is no player editing/deletion feature in
this scope; historical player metadata is not snapshotted.
