export type Mark = "x" | "o";
export type Cell = Mark | null;
export type Board = Cell[];

export type GameStatus =
  | "waiting"
  | "playing"
  | "won"
  | "lost"
  | "draw"
  | "opponent_left"
  | "reconnecting"
  | "error";

export interface StartPayload {
  marks: Record<string, string>;
  currentTurn: string;
  deadline: number;
}

export interface UpdatePayload {
  board: Board;
  currentTurn: string;
  deadline: number;
}

export interface DonePayload {
  board: Board;
  winner: string | null;
  winnerMark: string | null;
}

export interface TimerTickPayload {
  remaining: number;
}

export interface RejectedPayload {
  reason: string;
}

export interface LeaderboardRecord {
  leaderboardId: string;
  ownerId: string;
  username: string;
  score: number;
  subscore: number;
  numScore: number;
  rank: number;
  metadata?: Record<string, unknown>;
  createTime?: string;
  updateTime?: string;
}

export interface LeaderboardResult {
  records?: LeaderboardRecord[];
  ownerRecords?: LeaderboardRecord[];
  nextCursor?: string;
  prevCursor?: string;
}
