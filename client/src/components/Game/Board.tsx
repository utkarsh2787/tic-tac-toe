import { Cell } from "./Cell";
import type { Board as BoardType } from "../../types/game";
import styles from "./Board.module.css";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

interface BoardProps {
  board: BoardType;
  isMyTurn: boolean;
  onMove: (position: number) => void;
  winnerMark: string | null;
  winLine?: number[];
}

function getWinningCells(board: BoardType, winnerMark: string | null, winLine?: number[]): Set<number> {
  if (winLine && winLine.length) return new Set(winLine);
  if (!winnerMark) return new Set();
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] === winnerMark && board[b] === winnerMark && board[c] === winnerMark) {
      return new Set(line);
    }
  }
  return new Set();
}

export function Board({ board, isMyTurn, onMove, winnerMark, winLine }: BoardProps) {
  const winningCells = getWinningCells(board, winnerMark, winLine);

  return (
    <div className={styles.board} role="grid" aria-label="Tic-Tac-Toe board">
      {board.map((cell, index) => (
        <Cell
          key={index}
          value={cell}
          index={index}
          onClick={onMove}
          disabled={!isMyTurn}
          isWinning={winningCells.has(index)}
        />
      ))}
    </div>
  );
}
