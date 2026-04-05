import { useEffect, useState, useCallback } from "react";
import { nakamaClient, connectSocket, disconnectSocket } from "../lib/nakama";
import { useAuthStore } from "../store/authStore";

const DEVICE_ID_KEY = "ttt_device_id";
const SESSION_TOKEN_KEY = "ttt_session_token";
const SESSION_REFRESH_KEY = "ttt_session_refresh";

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function useNakama() {
  const { session, setSession, clearSession } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(
    async (username?: string) => {
      setLoading(true);
      setError(null);
      try {
        const deviceId = getOrCreateDeviceId();
        const newSession = await nakamaClient.authenticateDevice(
          deviceId,
          true,
          username
        );
        localStorage.setItem(SESSION_TOKEN_KEY, newSession.token);
        localStorage.setItem(
          SESSION_REFRESH_KEY,
          newSession.refresh_token || ""
        );
        setSession(newSession);
        await connectSocket(newSession);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Authentication failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [setSession]
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_REFRESH_KEY);
    disconnectSocket();
    clearSession();
  }, [clearSession]);

  // Try to restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const refreshToken = localStorage.getItem(SESSION_REFRESH_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Restore session from stored token
        const { Session } = await import("@heroiclabs/nakama-js");
        const restored = Session.restore(token, refreshToken || "");

        if (restored.isexpired(Date.now() / 1000)) {
          // Try to refresh
          if (refreshToken) {
            const refreshed = await nakamaClient.sessionRefresh(restored);
            localStorage.setItem(SESSION_TOKEN_KEY, refreshed.token);
            localStorage.setItem(
              SESSION_REFRESH_KEY,
              refreshed.refresh_token || ""
            );
            setSession(refreshed);
            await connectSocket(refreshed);
          } else {
            clearSession();
          }
        } else {
          setSession(restored);
          await connectSocket(restored);
        }
      } catch (e) {
        clearSession();
        localStorage.removeItem(SESSION_TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { session, loading, error, authenticate, signOut };
}
