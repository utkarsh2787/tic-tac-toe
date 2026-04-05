import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalGame, type Difficulty } from "../../hooks/useLocalGame";
import { Board } from "./Board";
import { GameResult } from "./GameResult";
import styles from "./GameScreen.module.css";
import localStyles from "./LocalGameScreen.module.css";

export function LocalGameScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const difficulty = (params.get("difficulty") || "hard") as Difficulty;

  const { board, isMyTurn, status, winnerMark, winLine, reset, makeMove } =
    useLocalGame(difficulty);

  const isGameOver = ["won", "lost", "draw"].includes(status);

  const getStatusText = () => {
    if (status === "won") return "You won!";
    if (status === "lost") return "Computer wins";
    if (status === "draw") return "It's a draw!";
    return isMyTurn ? "Your turn (X)" : "Computer thinking...";
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/lobby")}>
          ← Lobby
        </button>
        <div className={localStyles.difficultyBadge}>
          vs Computer · {difficulty === "hard" ? "Hard" : "Easy"}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.statusBar}>
          <p className={`${styles.statusText} ${isMyTurn && !isGameOver ? styles.myTurn : ""}`}>
            {getStatusText()}
          </p>
        </div>

        <Board
          board={board}
          isMyTurn={isMyTurn && status === "playing"}
          onMove={makeMove}
          winnerMark={winnerMark}
          winLine={winLine}
        />

        <div className={localStyles.legend}>
          <span className={localStyles.you}>You — X</span>
          <span className={localStyles.sep}>·</span>
          <span className={localStyles.cpu}>CPU — O</span>
        </div>
      </main>

      {isGameOver && (
        <GameResult status={status} onPlayAgain={reset} />
      )}
    </div>
  );
}
