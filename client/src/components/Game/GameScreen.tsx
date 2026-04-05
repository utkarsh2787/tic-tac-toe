import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "../../hooks/useMatch";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { Board } from "./Board";
import { TurnTimer } from "./TurnTimer";
import { GameResult } from "./GameResult";
import { useMatchmaker } from "../../hooks/useMatchmaker";
import { useEffect } from "react";
import styles from "./GameScreen.module.css";

export function GameScreen() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthStore();

  const {
    board,
    marks,
    myMark,
    isMyTurn,
    timer,
    status,
    winner,
    winnerMark,
    rejectedMessage,
    reset,
  } = useGameStore();

  const { sendMove } = useMatch(matchId || null);
  const { findMatch, matchId: newMatchId, status: mmStatus, reset: resetMm } = useMatchmaker();

  // Navigate to new game when rematch found
  useEffect(() => {
    if (mmStatus === "found" && newMatchId) {
      navigate(`/game/${newMatchId}`);
      resetMm();
    }
  }, [mmStatus, newMatchId, navigate, resetMm]);

  const handlePlayAgain = () => {
    reset();
    findMatch(false);
  };

  const getStatusText = () => {
    switch (status) {
      case "waiting":
        return "Waiting for opponent...";
      case "playing":
        return isMyTurn ? "Your turn!" : "Opponent's turn";
      case "reconnecting":
        return "Reconnecting...";
      default:
        return "";
    }
  };

  const getMyMarkLabel = () => {
    if (!myMark) return "";
    return `You are: ${myMark.toUpperCase()}`;
  };

  const isGameOver = ["won", "lost", "draw", "opponent_left", "error"].includes(status);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/lobby")}>
          ← Lobby
        </button>
        <div className={styles.matchInfo}>
          <span className={styles.markLabel}>{getMyMarkLabel()}</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.statusBar}>
          <p className={`${styles.statusText} ${isMyTurn && status === "playing" ? styles.myTurn : ""}`}>
            {getStatusText()}
          </p>
          {status === "playing" && (
            <TurnTimer seconds={timer} isMyTurn={isMyTurn} />
          )}
        </div>

        {rejectedMessage && (
          <div className={styles.rejected}>{rejectedMessage}</div>
        )}

        <Board
          board={board}
          isMyTurn={isMyTurn && status === "playing"}
          onMove={sendMove}
          winnerMark={winnerMark}
        />

        {status === "waiting" && (
          <div className={styles.waitingHint}>
            <div className={styles.pulsingDot} />
            <span>Share this match ID: <code>{matchId?.slice(0, 8)}...</code></span>
          </div>
        )}
      </main>

      {isGameOver && (
        <GameResult status={status} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
