import { TURN_SECONDS } from "../../lib/constants";
import styles from "./TurnTimer.module.css";

interface TurnTimerProps {
  seconds: number;
  isMyTurn: boolean;
}

export function TurnTimer({ seconds, isMyTurn }: TurnTimerProps) {
  const pct = Math.max(0, Math.min(100, (seconds / TURN_SECONDS) * 100));
  const urgent = seconds <= 10 && isMyTurn;

  return (
    <div className={styles.container}>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${urgent ? styles.urgent : ""} ${isMyTurn ? styles.myTurn : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`${styles.label} ${urgent ? styles.urgentLabel : ""}`}>
        {seconds}s
      </span>
    </div>
  );
}
