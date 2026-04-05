import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Ping Nakama immediately on page load so Render's cold start
// begins right away (free tier sleeps after 15min inactivity)
const HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";
const protocol = USE_SSL ? "https" : "http";
fetch(`${protocol}://${HOST}:${PORT}/healthcheck`).catch(() => {
  // ignore errors — just waking the server up
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
