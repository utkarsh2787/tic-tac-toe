import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nakamaClient } from "../../lib/nakama";
import { useAuthStore } from "../../store/authStore";
import type { LeaderboardResult, LeaderboardRecord } from "../../types/game";
import styles from "./LeaderboardScreen.module.css";

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchLeaderboard = async () => {
      try {
        const result = await nakamaClient.rpc(session, "get_leaderboard", {
          limit: 10,
        });
        const data = result.payload as LeaderboardResult;
        setRecords(data?.records || []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load leaderboard";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [session]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/lobby")}>
          ← Back
        </button>
        <h1 className={styles.title}>Leaderboard</h1>
        <div style={{ width: "4rem" }} />
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.spinner} />
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : records.length === 0 ? (
          <p className={styles.empty}>No records yet. Be the first to win!</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Rank</span>
              <span>Player</span>
              <span>Wins</span>
            </div>
            {records.map((record, i) => (
              <div
                key={record.ownerId}
                className={`${styles.row} ${i < 3 ? styles[`top${i + 1}` as keyof typeof styles] : ""}`}
              >
                <span className={styles.rank}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className={styles.player}>
                  {record.username || "Player"}
                  <span className={styles.userId}>#{record.ownerId.slice(0, 6)}</span>
                </span>
                <span className={styles.wins}>{record.score}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
