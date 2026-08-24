import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ErrorPayload,
  type PlayerKickedPayload,
  type PrivatePlayerState,
  type PrivateStateUpdatedPayload,
  type PublicRoomState,
  type ReconnectConfirmationRequiredPayload,
  type RoomClosedPayload,
  type RoomJoinedPayload,
  type RoomStateUpdatedPayload,
} from "@kill-wolf/shared";
import { getSocket } from "../lib/socketClient";
import { clearStoredSession, getStoredSession, setStoredSession } from "../lib/session";

export type ConnectionStatus =
  | "CONNECTING"
  | "NEEDS_NAME"
  | "NEEDS_RECONNECT_CONFIRM"
  | "JOINED"
  | "KICKED"
  | "CLOSED"
  | "ERROR";

export interface RoomConnection {
  status: ConnectionStatus;
  publicState: PublicRoomState | null;
  privateState: PrivatePlayerState | null;
  selfPlayerId: string | null;
  errorMessage: string | null;
  lastActionError: string | null;
  joinWithName: (name: string) => void;
  confirmReconnectIdentity: () => void;
}

export function useRoomConnection(roomId: string): RoomConnection {
  const [status, setStatus] = useState<ConnectionStatus>("CONNECTING");
  const [publicState, setPublicState] = useState<PublicRoomState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastActionError, setLastActionError] = useState<string | null>(null);
  const selfPlayerIdRef = useRef<string | null>(null);
  const pendingNameRef = useRef<string | null>(null);
  const statusRef = useRef<ConnectionStatus>("CONNECTING");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const attemptJoin = useCallback(() => {
    const socket = getSocket();
    const stored = getStoredSession(roomId);
    if (stored) {
      pendingNameRef.current = stored.name;
      socket.emit(CLIENT_EVENTS.JOIN_ROOM, {
        roomId,
        name: stored.name,
        reconnectToken: stored.reconnectToken,
      });
    } else {
      setStatus("NEEDS_NAME");
    }
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();
    setStatus("CONNECTING");

    function handleRoomJoined(payload: RoomJoinedPayload) {
      selfPlayerIdRef.current = payload.playerId;
      setStoredSession(roomId, {
        playerId: payload.playerId,
        reconnectToken: payload.reconnectToken,
        name: pendingNameRef.current ?? "",
      });
      setStatus("JOINED");
    }

    function handleRoomCreated(payload: RoomJoinedPayload) {
      handleRoomJoined(payload);
    }

    function handleReconnectConfirmationRequired(_payload: ReconnectConfirmationRequiredPayload) {
      setStatus("NEEDS_RECONNECT_CONFIRM");
    }

    function handleRoomStateUpdated(payload: RoomStateUpdatedPayload) {
      setPublicState(payload);
    }

    function handlePrivateStateUpdated(payload: PrivateStateUpdatedPayload) {
      setPrivateState(payload);
    }

    function handlePlayerKicked(payload: PlayerKickedPayload) {
      if (payload.playerId === selfPlayerIdRef.current) {
        clearStoredSession(roomId);
        setStatus("KICKED");
      }
    }

    function handleRoomClosed(_payload: RoomClosedPayload) {
      clearStoredSession(roomId);
      setStatus("CLOSED");
    }

    function handleError(payload: ErrorPayload) {
      if (payload.code === "ROOM_NOT_FOUND" || payload.code === "KICKED") {
        clearStoredSession(roomId);
        setErrorMessage(payload.message);
        setStatus("ERROR");
        return;
      }
      if (statusRef.current !== "JOINED") {
        setErrorMessage(payload.message);
        setStatus("NEEDS_NAME");
        return;
      }
      setLastActionError(payload.message);
    }

    socket.on(SERVER_EVENTS.ROOM_CREATED, handleRoomCreated);
    socket.on(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
    socket.on(SERVER_EVENTS.RECONNECT_CONFIRMATION_REQUIRED, handleReconnectConfirmationRequired);
    socket.on(SERVER_EVENTS.ROOM_STATE_UPDATED, handleRoomStateUpdated);
    socket.on(SERVER_EVENTS.PRIVATE_STATE_UPDATED, handlePrivateStateUpdated);
    socket.on(SERVER_EVENTS.PLAYER_KICKED, handlePlayerKicked);
    socket.on(SERVER_EVENTS.ROOM_CLOSED, handleRoomClosed);
    socket.on(SERVER_EVENTS.ERROR, handleError);

    attemptJoin();

    return () => {
      socket.off(SERVER_EVENTS.ROOM_CREATED, handleRoomCreated);
      socket.off(SERVER_EVENTS.ROOM_JOINED, handleRoomJoined);
      socket.off(SERVER_EVENTS.RECONNECT_CONFIRMATION_REQUIRED, handleReconnectConfirmationRequired);
      socket.off(SERVER_EVENTS.ROOM_STATE_UPDATED, handleRoomStateUpdated);
      socket.off(SERVER_EVENTS.PRIVATE_STATE_UPDATED, handlePrivateStateUpdated);
      socket.off(SERVER_EVENTS.PLAYER_KICKED, handlePlayerKicked);
      socket.off(SERVER_EVENTS.ROOM_CLOSED, handleRoomClosed);
      socket.off(SERVER_EVENTS.ERROR, handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, attemptJoin]);

  const joinWithName = useCallback(
    (name: string) => {
      pendingNameRef.current = name;
      getSocket().emit(CLIENT_EVENTS.JOIN_ROOM, { roomId, name });
    },
    [roomId],
  );

  const confirmReconnectIdentity = useCallback(() => {
    const name = pendingNameRef.current;
    if (!name) return;
    getSocket().emit(CLIENT_EVENTS.CONFIRM_RECONNECT, { roomId, name });
  }, [roomId]);

  return {
    status,
    publicState,
    privateState,
    selfPlayerId: selfPlayerIdRef.current,
    errorMessage,
    lastActionError,
    joinWithName,
    confirmReconnectIdentity,
  };
}
