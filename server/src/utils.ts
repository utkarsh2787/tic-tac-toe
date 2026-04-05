const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

function checkWinner(board: Array<string | null>): string | null {
  for (var i = 0; i < WIN_LINES.length; i++) {
    var line = WIN_LINES[i];
    var a = line[0];
    var b = line[1];
    var c = line[2];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as string;
    }
  }
  return null;
}

function isBoardFull(board: Array<string | null>): boolean {
  return board.every(function (cell) {
    return cell !== null;
  });
}

function validateMove(board: Array<string | null>, pos: number): boolean {
  return pos >= 0 && pos < 9 && board[pos] === null;
}

function buildEmptyBoard(): Array<null> {
  return [null, null, null, null, null, null, null, null, null];
}
