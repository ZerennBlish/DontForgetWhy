import { getDb } from './database';

// ---------------------------------------------------------------------------
// Chess game persistence (single active game, id = 1)
// ---------------------------------------------------------------------------

export interface SavedChessGame {
  fen: string;
  playerColor: 'w' | 'b';
  difficulty: number;       // index into DIFFICULTY_LEVELS (0-4)
  moveHistory: string[];    // SAN moves in order
  takeBackUsed: boolean;
  blunderCount: number;
  startedAt: string;        // ISO
  updatedAt: string;        // ISO
}

interface ChessGameRow {
  id: number;
  fen: string;
  playerColor: 'w' | 'b';
  difficulty: number;
  moveHistory: string;
  takeBackUsed: number;
  blunderCount: number;
  startedAt: string;
  updatedAt: string;
}

function rowToGame(row: ChessGameRow): SavedChessGame {
  let moveHistory: string[] = [];
  try {
    const parsed = JSON.parse(row.moveHistory);
    if (Array.isArray(parsed)) moveHistory = parsed.filter((m) => typeof m === 'string');
  } catch {}
  // Clamp to the 0–4 range that the current DIFFICULTY_LEVELS array supports.
  // Protects against legacy saves from a build that shipped extra levels
  // (e.g. the old Cloud difficulty at index 5); such games now resolve to
  // Master instead of crashing or rendering a blank label.
  const clampedDifficulty = Math.min(Math.max(row.difficulty ?? 1, 0), 4);
  return {
    fen: row.fen,
    playerColor: row.playerColor,
    difficulty: clampedDifficulty,
    moveHistory,
    takeBackUsed: !!row.takeBackUsed,
    blunderCount: row.blunderCount,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
  };
}

/** Save or update the current game (upsert on id = 1). */
export async function saveChessGame(game: SavedChessGame): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO chess_game
      (id, fen, playerColor, difficulty, moveHistory, takeBackUsed, blunderCount, startedAt, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.fen,
      game.playerColor,
      game.difficulty,
      JSON.stringify(game.moveHistory ?? []),
      game.takeBackUsed ? 1 : 0,
      game.blunderCount,
      game.startedAt,
      game.updatedAt,
    ],
  );
}

/** Load the saved game, or null if none exists. */
export async function loadChessGame(): Promise<SavedChessGame | null> {
  const db = getDb();
  const row = db.getFirstSync<ChessGameRow>('SELECT * FROM chess_game WHERE id = 1');
  return row ? rowToGame(row) : null;
}

/** Delete the saved game (on win/loss/draw/resign). */
export async function clearChessGame(): Promise<void> {
  const db = getDb();
  db.runSync('DELETE FROM chess_game WHERE id = 1');
}
