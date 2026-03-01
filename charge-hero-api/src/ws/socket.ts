// ==========================================
// WebSocket manager — single instance, auto-reconnect
// ==========================================

import type { WsEvent } from '@/domain/types';


const DEFAULT_PORT = import.meta.env.VITE_WS_PORT ?? '8080';

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `ws://${window.location.hostname}:${DEFAULT_PORT}`;

const RECONNECT_DELAY = Number(
  import.meta.env.VITE_WS_RECONNECT_DELAY ?? 3000
);

type WsCallback = (event: WsEvent) => void;
type StatusCallback = (connected: boolean) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionallyClosed = false;

const listeners: Set<WsCallback> = new Set();
const statusListeners: Set<StatusCallback> = new Set();

function notifyStatus(connected: boolean) {
  statusListeners.forEach((cb) => cb(connected));
}

function connect() {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  intentionallyClosed = false;

  try {
    socket = new WebSocket(WS_URL);
  } catch {
    notifyStatus(false);
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    notifyStatus(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  socket.onmessage = (msg) => {
    let parsed: WsEvent;
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      // Ignore malformed messages
      return;
    }

    // Basic shape validation
    if (!parsed || typeof parsed.type !== 'string' || !('payload' in parsed)) {
      return;
    }

    listeners.forEach((cb) => cb(parsed));
  };

  socket.onclose = () => {
    notifyStatus(false);
    if (!intentionallyClosed) {
      scheduleReconnect();
    }
  };

  socket.onerror = () => {
    notifyStatus(false);
    socket?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY);
}

function disconnect() {
  intentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

export const wsManager = {
  connect,
  disconnect,
  onMessage: (cb: WsCallback) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  onStatus: (cb: StatusCallback) => {
    statusListeners.add(cb);
    return () => statusListeners.delete(cb);
  },
};
