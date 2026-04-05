import { create } from "zustand";
import type {
  Board,
  GameStatus,
  StartPayload,
  UpdatePayload,
  DonePayload,
} from "../types/game";
import { TURN_SECONDS } from "../lib/constants";

interface GameState {
  board: Board;
  marks: Record<string, string>;
  currentTurn: string;
  timer: number;
  status: GameStatus;
  winner: string | null;
  winnerMark: string | null;
  rejectedMessage: string | null;
  myUserId: string | null;

  // Computed
  myMark: string | null;
  isMyTurn: boolean;

  // Actions
  setMyUserId: (userId: string) => void;
  applyStart: (payload: StartPayload) => void;
  applyUpdate: (payload: UpdatePayload) => void;
  applyDone: (payload: DonePayload) => void;
  setTimer: (seconds: number) => void;
  setRejected: (message: string) => void;
  setOpponentLeft: () => void;
  setStatus: (status: GameStatus) => void;
  reset: () => void;
}

const initialState = {
  board: Array(9).fill(null) as Board,
  marks: {},
  currentTurn: "",
  timer: TURN_SECONDS,
  status: "waiting" as GameStatus,
  winner: null,
  winnerMark: null,
  rejectedMessage: null,
  myUserId: null,
  myMark: null,
  isMyTurn: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setMyUserId: (userId: string) =>
    set((state) => ({
      myUserId: userId,
      myMark: state.marks[userId] || null,
      isMyTurn: state.currentTurn === userId,
    })),

  applyStart: (payload: StartPayload) =>
    set((state) => {
      const myUserId = state.myUserId;
      const myMark = myUserId ? payload.marks[myUserId] || null : null;
      return {
        marks: payload.marks,
        myMark,
        currentTurn: payload.currentTurn,
        isMyTurn: payload.currentTurn === myUserId,
        status: "playing",
        timer: TURN_SECONDS,
      };
    }),

  applyUpdate: (payload: UpdatePayload) =>
    set((state) => ({
      board: payload.board,
      currentTurn: payload.currentTurn,
      isMyTurn: payload.currentTurn === state.myUserId,
      timer: TURN_SECONDS,
      rejectedMessage: null,
      // If UPDATE arrives before START (reconnect scenario), transition to playing
      status: state.status === "waiting" || state.status === "reconnecting" ? "playing" : state.status,
    })),

  applyDone: (payload: DonePayload) =>
    set((state) => {
      let status: GameStatus = "draw";
      if (payload.winner && payload.winner !== "draw") {
        status = payload.winner === state.myUserId ? "won" : "lost";
      }
      return {
        board: payload.board,
        winner: payload.winner,
        winnerMark: payload.winnerMark,
        status,
        isMyTurn: false,
        timer: 0,
      };
    }),

  setTimer: (seconds: number) => set({ timer: seconds }),

  setRejected: (message: string) => set({ rejectedMessage: message }),

  setOpponentLeft: () => set({ status: "opponent_left" }),

  setStatus: (status: GameStatus) => set({ status }),

  reset: () =>
    set((state) => ({
      ...initialState,
      myUserId: state.myUserId,
    })),
}));
