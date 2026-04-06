import { getDb } from './database';

// ---------------------------------------------------------------------------
// Checkers game persistence (single active game, id = 1)
// ---------------------------------------------------------------------------

export interface SavedCheckersGame {
  board: string;           // serialized board (JSON stringified Board)
  turn: 'r' | 'b';        // whose turn
  playerColor: 'r' | 'b';
  difficulty: number;      // index into DIFFICULTY_LEVELS (0-4)
  moveCount: number;       // total moves played
  startedAt: string;       // ISO
  updatedAt: string;       // ISO
}

interface CheckersGameRow {
  id: number;
  board: string;
  turn: 'r' | 'b';
  playerColor: 'r' | 'b';
  difficulty: number;
  moveCount: number;
  startedAt: string;
  updatedAt: string;
}

function rowToGame(row: CheckersGameRow): SavedCheckersGame {
  return {
    board: row.board,
    turn: row.turn,
    playerColor: row.playerColor,
    difficulty: row.difficulty,
    moveCount: row.moveCount,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
  };
}

/** Save or update the current game (upsert on id = 1). */
export async function saveCheckersGame(game: SavedCheckersGame): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO checkers_game
      (id, board, turn, playerColor, difficulty, moveCount, startedAt, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.board,
      game.turn,
      game.playerColor,
      game.difficulty,
      game.moveCount,
      game.startedAt,
      game.updatedAt,
    ],
  );
}

/** Load the saved game, or null if none exists. */
export async function loadCheckersGame(): Promise<SavedCheckersGame | null> {
  const db = getDb();
  const row = db.getFirstSync<CheckersGameRow>('SELECT * FROM checkers_game WHERE id = 1');
  return row ? rowToGame(row) : null;
}

/** Delete the saved game (on win/loss/resign). */
export async function clearCheckersGame(): Promise<void> {
  const db = getDb();
  db.runSync('DELETE FROM checkers_game WHERE id = 1');
}
