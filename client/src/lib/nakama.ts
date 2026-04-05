import { Client, Session, Socket } from "@heroiclabs/nakama-js";

const HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";
const SERVER_KEY = import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultkey";

export const nakamaClient = new Client(SERVER_KEY, HOST, PORT, USE_SSL);

let _socket: Socket | null = null;

export function getSocket(): Socket | null {
  return _socket;
}

export async function connectSocket(session: Session): Promise<Socket> {
  // Always reuse an existing open socket — multiple callers share one connection
  if (_socket) {
    return _socket;
  }
  const socket = nakamaClient.createSocket(USE_SSL, false);
  await socket.connect(session, true);
  _socket = socket;
  return socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    try {
      _socket.disconnect(false);
    } catch {}
    _socket = null;
  }
}
