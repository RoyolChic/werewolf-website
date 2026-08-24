interface StoredSession {
  playerId: string;
  reconnectToken: string;
  name: string;
}

function storageKey(roomId: string): string {
  return `kill-wolf:${roomId}`;
}

export function getStoredSession(roomId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function setStoredSession(roomId: string, session: StoredSession): void {
  try {
    localStorage.setItem(storageKey(roomId), JSON.stringify(session));
  } catch {
    // ignore storage failures (e.g. private mode)
  }
}

export function clearStoredSession(roomId: string): void {
  try {
    localStorage.removeItem(storageKey(roomId));
  } catch {
    // ignore
  }
}
