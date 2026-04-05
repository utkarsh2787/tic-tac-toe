import { useState, useEffect, FormEvent } from "react";
import { useNakama } from "../../hooks/useNakama";
import styles from "./AuthScreen.module.css";

export function AuthScreen() {
  const { authenticate, loading, error } = useNakama();
  const [username, setUsername] = useState("");
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => {
    const HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
    const PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
    const USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";
    const protocol = USE_SSL ? "https" : "http";

    const checkServer = async () => {
      // Poll until server responds (handles Render cold start)
      for (let i = 0; i < 20; i++) {
        try {
          const res = await fetch(`${protocol}://${HOST}:${PORT}/healthcheck`);
          if (res.ok) { setServerReady(true); return; }
        } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      }
      setServerReady(true); // give up after 60s, let user try anyway
    };

    checkServer();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    authenticate(username.trim() || undefined);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.x}>X</span>
          <span className={styles.divider}>vs</span>
          <span className={styles.o}>O</span>
        </div>
        <h1 className={styles.title}>Tic-Tac-Toe</h1>
        <p className={styles.subtitle}>Multiplayer · Real-time</p>

        {!serverReady && (
          <div className={styles.wakeup}>
            <div className={styles.wakeupSpinner} />
            <span>Waking up server... (~30s)</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Choose a username (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            maxLength={20}
            disabled={loading}
          />
          <button type="submit" className={styles.button} disabled={loading || !serverReady}>
            {loading ? "Connecting..." : !serverReady ? "Waiting for server..." : "Play Now"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
