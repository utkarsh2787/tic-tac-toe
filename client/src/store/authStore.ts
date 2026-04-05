import { create } from "zustand";
import { Session } from "@heroiclabs/nakama-js";

interface AuthState {
  session: Session | null;
  userId: string | null;
  username: string | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  userId: null,
  username: null,
  setSession: (session: Session) =>
    set({
      session,
      userId: session.user_id || null,
      username: session.username || null,
    }),
  clearSession: () => set({ session: null, userId: null, username: null }),
}));
