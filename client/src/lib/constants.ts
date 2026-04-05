// Must be kept in sync with server/src/constants.ts
export enum OpCode {
  UPDATE = 1,
  START = 2,
  DONE = 3,
  REJECTED = 4,
  OPPONENT_LEFT = 5,
  TIMER_TICK = 6,
}

export enum ClientOpCode {
  MOVE = 101,
}

export const TURN_SECONDS = 30;
