import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthScreen } from "./components/Auth/AuthScreen";
import { LobbyScreen } from "./components/Lobby/LobbyScreen";
import { GameScreen } from "./components/Game/GameScreen";
import { LocalGameScreen } from "./components/Game/LocalGameScreen";
import { LeaderboardScreen } from "./components/Leaderboard/LeaderboardScreen";
import { useAuthStore } from "./store/authStore";
import { useNakama } from "./hooks/useNakama";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore();
  const { loading } = useNakama();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
        }}
      >
        <div
          style={{
            width: "2.5rem",
            height: "2.5rem",
            border: "3px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { session } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={session ? <Navigate to="/lobby" replace /> : <AuthScreen />}
        />
        <Route
          path="/lobby"
          element={
            <RequireAuth>
              <LobbyScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/game/:matchId"
          element={
            <RequireAuth>
              <GameScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/local"
          element={
            <RequireAuth>
              <LocalGameScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireAuth>
              <LeaderboardScreen />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
