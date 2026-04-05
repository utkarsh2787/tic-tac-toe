import { useEffect, useRef, useCallback } from "react";
import type { Socket } from "@heroiclabs/nakama-js";
import { connectSocket } from "../lib/nakama";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import { OpCode, ClientOpCode } from "../lib/constants";
import type {
  StartPayload,
  UpdatePayload,
  DonePayload,
  TimerTickPayload,
  RejectedPayload,
} from "../types/game";

export function useMatch(matchId: string | null) {
  const { session } = useAuthStore();
  // Use a ref so we only ever run the join logic once per matchId
  const joinedRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const {
    setMyUserId,
    applyStart,
    applyUpdate,
    applyDone,
    setTimer,
    setRejected,
    setOpponentLeft,
    setStatus,
    reset,
  } = useGameStore();

  const handleMatchData = useCallback(
    (result: { op_code: number; data: string | Uint8Array }) => {
      let payload: unknown;
      try {
        const raw =
          typeof result.data === "string"
            ? result.data
            : new TextDecoder().decode(result.data);
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }

      switch (result.op_code) {
        case OpCode.START:
          applyStart(payload as StartPayload);
          break;
        case OpCode.UPDATE:
          // UPDATE may arrive on reconnect instead of START — also mark as playing
          applyUpdate(payload as UpdatePayload);
          break;
        case OpCode.DONE:
          applyDone(payload as DonePayload);
          break;
        case OpCode.REJECTED:
          setRejected((payload as RejectedPayload)?.reason || "Move rejected");
          setTimeout(() => setRejected(""), 2000);
          break;
        case OpCode.OPPONENT_LEFT:
          setOpponentLeft();
          break;
        case OpCode.TIMER_TICK:
          setTimer((payload as TimerTickPayload)?.remaining ?? 0);
          break;
      }
    },
    [applyStart, applyUpdate, applyDone, setTimer, setRejected, setOpponentLeft]
  );

  const attemptReconnect = useCallback(
    async (attempt: number) => {
      if (attempt >= 3 || !session || !matchIdRef.current) {
        setStatus("error");
        return;
      }

      setStatus("reconnecting");
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));

      try {
        const socket = await connectSocket(session);
        socket.onmatchdata = handleMatchData;
        socket.ondisconnect = () => {
          attemptReconnect(reconnectAttemptsRef.current++);
        };
        await socket.joinMatch(matchIdRef.current);
        socketRef.current = socket;
        reconnectAttemptsRef.current = 0;
      } catch {
        attemptReconnect(attempt + 1);
      }
    },
    [session, handleMatchData, setStatus]
  );

  const sendMove = useCallback((position: number) => {
    const socket = socketRef.current;
    const mid = matchIdRef.current;
    if (!socket || !mid) return;
    try {
      socket.sendMatchState(mid, ClientOpCode.MOVE, JSON.stringify({ position }));
    } catch (e) {
      console.error("Failed to send move:", e);
    }
  }, []);

  useEffect(() => {
    if (!matchId || !session) return;

    // Guard: only join each matchId once — prevents React StrictMode double-invoke
    // from calling leaveMatch then joinMatch in rapid succession on the same matchId
    if (joinedRef.current === matchId) return;
    joinedRef.current = matchId;

    matchIdRef.current = matchId;
    reset();
    if (session.user_id) {
      setMyUserId(session.user_id);
    }

    const joinMatch = async () => {
      try {
        const socket = await connectSocket(session);
        socket.onmatchdata = handleMatchData;
        socket.ondisconnect = () => {
          setStatus("reconnecting");
          reconnectAttemptsRef.current = 0;
          attemptReconnect(0);
        };
        await socket.joinMatch(matchId);
        socketRef.current = socket;
      } catch (e) {
        console.error("joinMatch failed:", e);
        setStatus("error");
      }
    };

    joinMatch();

    return () => {
      // Don't leave on StrictMode cleanup — the joinedRef guard prevents re-joining
      // Only clear refs so the next matchId starts fresh
      socketRef.current = null;
    };
  }, [matchId, session]); // eslint-disable-line react-hooks/exhaustive-deps

  return { sendMove };
}
