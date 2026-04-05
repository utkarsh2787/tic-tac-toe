import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMatchmaker } from "../../hooks/useMatchmaker";
import { useAuthStore } from "../../store/authStore";
import { useNakama } from "../../hooks/useNakama";
import styles from "./LobbyScreen.module.css";

export function LobbyScreen() {
  const navigate = useNavigate();
  const { username } = useAuthStore();
  const { signOut } = useNakama();
  const { status, matchId, error, findMatch, reset } = useMatchmaker();
  const [fastMode, setFastMode] = useState(false);

  useEffect(() => {
    if (status === "found" && matchId) {
      navigate(`/game/${matchId}`);
      reset();
    }
  }, [status, matchId, navigate, reset]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.x}>X</span>
          <span className={styles.o}>O</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.username}>{username || "Player"}</span>
          <button className={styles.signOutBtn} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Ready to Play?</h1>
        <p className={styles.subtitle}>
          Get matched with a player instantly
        </p>

        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeBtn} ${!fastMode ? styles.modeActive : ""}`}
            onClick={() => setFastMode(false)}
            disabled={status === "searching"}
          >
            Classic
            <span className={styles.modeDesc}>No time limit</span>
          </button>
          <button
            className={`${styles.modeBtn} ${fastMode ? styles.modeActive : ""}`}
            onClick={() => setFastMode(true)}
            disabled={status === "searching"}
          >
            Timed
            <span className={styles.modeDesc}>30s per turn</span>
          </button>
        </div>

        {status === "searching" ? (
          <div className={styles.searching}>
            <div className={styles.spinner} />
            <p>Finding a match...</p>
            <button
              className={styles.cancelBtn}
              onClick={reset}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className={styles.playBtn}
            onClick={() => findMatch(fastMode)}
          >
            Find Match
          </button>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <div className={styles.cpuSection}>
          <p className={styles.cpuLabel}>Play vs Computer</p>
          <div className={styles.cpuBtns}>
            <button
              className={styles.cpuBtn}
              onClick={() => navigate("/local?difficulty=easy")}
            >
              Easy
            </button>
            <button
              className={`${styles.cpuBtn} ${styles.cpuBtnHard}`}
              onClick={() => navigate("/local?difficulty=hard")}
            >
              Hard
            </button>
          </div>
        </div>

        <button
          className={styles.leaderboardBtn}
          onClick={() => navigate("/leaderboard")}
        >
          Leaderboard
        </button>
      </main>
    </div>
  );
}
