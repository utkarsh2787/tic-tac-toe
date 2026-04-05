// Opcodes sent FROM server TO clients
const enum OpCode {
  UPDATE = 1,
  START = 2,
  DONE = 3,
  REJECTED = 4,
  OPPONENT_LEFT = 5,
  TIMER_TICK = 6,
}

// Opcodes sent FROM clients TO server
const enum ClientOpCode {
  MOVE = 101,
}

const MODULE_NAME = "tic_tac_toe";
const TICK_RATE = 5; // 5 ticks/sec
const TURN_SECS = 30; // 30s timer mode
const TURN_TICKS = TURN_SECS * TICK_RATE;
const EMPTY_TIMEOUT_TICKS = 30 * TICK_RATE; // close empty match after 30s
const BOARD_SIZE = 9;

const LEADERBOARD_WINS = "ttt_wins";
const LEADERBOARD_LOSSES = "ttt_losses";
const LEADERBOARD_STREAKS = "ttt_streaks";
