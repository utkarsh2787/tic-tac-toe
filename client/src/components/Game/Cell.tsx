import styles from "./Cell.module.css";

interface CellProps {
  value: string | null;
  index: number;
  onClick: (index: number) => void;
  disabled: boolean;
  isWinning?: boolean;
}

export function Cell({ value, index, onClick, disabled, isWinning }: CellProps) {
  return (
    <button
      className={`${styles.cell} ${value ? styles.filled : ""} ${isWinning ? styles.winning : ""} ${disabled || value ? styles.disabled : ""}`}
      onClick={() => !disabled && !value && onClick(index)}
      disabled={disabled || !!value}
      aria-label={`Cell ${index + 1}: ${value || "empty"}`}
    >
      {value && (
        <span
          className={value === "x" ? styles.markX : styles.markO}
        >
          {value.toUpperCase()}
        </span>
      )}
    </button>
  );
}
