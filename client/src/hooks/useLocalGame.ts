import { useState, useCallback, useEffect, useRef } from "react";
import type { Board, GameStatus } from "../types/game";
import { getBestMove, getRandomMove } from "../lib/minimax";

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): { mark: string; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a] as string, line };
    }
  }
  return null;
}

export type Difficulty = "easy" | "hard";

interface LocalGameState {
  board: Board;
  isMyTurn: boolean;
  status: GameStatus;
  winnerMark: string | null;
  winLine: number[];
  reset: () => void;
  makeMove: (position: number) => void;
}

export function useLocalGame(difficulty: Difficulty): LocalGameState {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [winnerMark, setWinnerMark] = useState<string | null>(null);
  const [winLine, setWinLine] = useState<number[]>([]);
  // Track if AI move is scheduled to prevent double-moves
  const aiPending = useRef(false);

  const checkEnd = useCallback((b: Board): boolean => {
    const result = checkWinner(b);
    if (result) {
      setWinnerMark(result.mark);
      setWinLine(result.line);
      setStatus(result.mark === "x" ? "won" : "lost");
      return true;
    }
    if (b.every((c) => c !== null)) {
      setStatus("draw");
      return true;
    }
    return false;
  }, []);

  const makeMove = useCallback(
    (position: number) => {
      if (!isMyTurn || status !== "playing") return;
      setBoard((prev) => {
        if (prev[position] !== null) return prev;
        const next = [...prev] as Board;
        next[position] = "x";
        if (!checkEnd(next)) {
          setIsMyTurn(false);
        }
        return next;
      });
    },
    [isMyTurn, status, checkEnd]
  );

  // AI move after player moves
  useEffect(() => {
    if (isMyTurn || status !== "playing" || aiPending.current) return;

    aiPending.current = true;
    const timer = setTimeout(() => {
      setBoard((prev) => {
        const move =
          difficulty === "hard" ? getBestMove([...prev] as Board) : getRandomMove([...prev] as Board);
        if (move === -1) return prev;
        const next = [...prev] as Board;
        next[move] = "o";
        if (!checkEnd(next)) {
          setIsMyTurn(true);
        }
        return next;
      });
      aiPending.current = false;
    }, 500); // small delay so AI doesn't feel instant

    return () => {
      clearTimeout(timer);
      aiPending.current = false;
    };
  }, [isMyTurn, status, difficulty, checkEnd]);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsMyTurn(true);
    setStatus("playing");
    setWinnerMark(null);
    setWinLine([]);
    aiPending.current = false;
  }, []);

  return { board, isMyTurn, status, winnerMark, winLine, reset, makeMove };
}
