import {onRequest} from "firebase-functions/v2/https";
import {getTopMoves, Board, Piece, PieceColor} from "./checkersEngine";

function isValidPiece(p: unknown): p is Piece {
  if (typeof p !== "object" || p === null) return false;
  const obj = p as Record<string, unknown>;
  return (
    (obj.color === "r" || obj.color === "b") &&
    typeof obj.king === "boolean"
  );
}

function isValidBoard(b: unknown): b is Board {
  if (!Array.isArray(b) || b.length !== 8) return false;
  for (const row of b) {
    if (!Array.isArray(row) || row.length !== 8) return false;
    for (const cell of row) {
      if (cell !== null && !isValidPiece(cell)) return false;
    }
  }
  return true;
}

function isValidTurn(t: unknown): t is PieceColor {
  return t === "r" || t === "b";
}

export const checkersAI = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 30,
    maxInstances: 10,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const {board, turn} = req.body;

      if (!isValidBoard(board)) {
        res.status(400).json({
          error: "Invalid board: must be 8x8 array of Piece|null",
        });
        return;
      }

      if (!isValidTurn(turn)) {
        res.status(400).json({error: "Invalid turn: must be \"r\" or \"b\""});
        return;
      }

      const ranked = getTopMoves(board, turn, 20, 6000, 5);
      res.status(200).json({moves: ranked});
    } catch (err) {
      console.error("checkersAI error:", err);
      res.status(500).json({error: "Internal server error"});
    }
  },
);
