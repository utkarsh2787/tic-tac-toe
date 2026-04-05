import { useState, useCallback } from "react";
import { nakamaClient } from "../lib/nakama";
import { useAuthStore } from "../store/authStore";

type MatchmakerStatus = "idle" | "searching" | "found" | "error";

export function useMatchmaker() {
  const { session } = useAuthStore();
  const [status, setStatus] = useState<MatchmakerStatus>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const findMatch = useCallback(
    async (fast = false) => {
      if (!session) {
        setError("Not authenticated");
        return;
      }

      setStatus("searching");
      setError(null);
      setMatchId(null);

      try {
        const result = await nakamaClient.rpc(session, "find_match", {
          fast,
        });

        const data = result.payload as { matchId: string };
        if (!data?.matchId) {
          throw new Error("Invalid response from matchmaker");
        }

        setMatchId(data.matchId);
        setStatus("found");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Matchmaking failed";
        setError(msg);
        setStatus("error");
      }
    },
    [session]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setMatchId(null);
    setError(null);
  }, []);

  return { status, matchId, error, findMatch, reset };
}
