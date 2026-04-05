interface MatchLabel {
  open: 0 | 1;
  fast: 0 | 1;
}

interface MatchState {
  label: MatchLabel;
  board: Array<string | null>;
  marks: { [userId: string]: string };
  presences: { [userId: string]: nkruntime.Presence };
  joinsInProgress: number;
  playing: boolean;
  currentTurn: string;
  deadlineTick: number;
  emptyTicks: number;
  winner: string | null;
  streaks: { [userId: string]: number };
}

interface MovePayload {
  position: number;
}

interface StartPayload {
  marks: { [userId: string]: string };
  currentTurn: string;
  deadline: number;
}

interface UpdatePayload {
  board: Array<string | null>;
  currentTurn: string;
  deadline: number;
}

interface DonePayload {
  board: Array<string | null>;
  winner: string | null;
  winnerMark: string | null;
}

interface TimerTickPayload {
  remaining: number;
}
