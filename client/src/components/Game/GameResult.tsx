import { useNavigate } from "react-router-dom";
import type { GameStatus } from "../../types/game";
import styles from "./GameResult.module.css";

interface GameResultProps {
  status: GameStatus;
  onPlayAgain: () => void;
}

const MESSAGES: Record<string, { title: string; subtitle: string; emoji: string }> = {
  won: { title: "You Won!", subtitle: "Congratulations!", emoji: "🏆" },
  lost: { title: "You Lost", subtitle: "Better luck next time", emoji: "😔" },
  draw: { title: "Draw!", subtitle: "Well played by both", emoji: "🤝" },
  opponent_left: { title: "Opponent Left", subtitle: "You win by default", emoji: "🚪" },
  error: { title: "Connection Error", subtitle: "Match ended unexpectedly", emoji: "⚠️" },
};

export function GameResult({ status, onPlayAgain }: GameResultProps) {
  const navigate = useNavigate();
  const info = MESSAGES[status];

  if (!info) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <span className={styles.emoji}>{info.emoji}</span>
        <h2 className={styles.title}>{info.title}</h2>
        <p className={styles.subtitle}>{info.subtitle}</p>
        <div className={styles.actions}>
          <button className={styles.playAgainBtn} onClick={onPlayAgain}>
            Play Again
          </button>
          <button
            className={styles.lobbyBtn}
            onClick={() => navigate("/lobby")}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
