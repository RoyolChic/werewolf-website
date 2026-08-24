import type { Server, Socket } from "socket.io";
import {
  CLIENT_EVENTS,
  type CancelCardPayload,
  type ConfirmCardPayload,
  type ConfirmRolePayload,
  type PickCardPayload,
} from "@kill-wolf/shared";
import { emitError, withRoomAndPlayer } from "../helpers";
import { cancelCard, confirmCard, confirmRole, pickCard } from "../../game/engine";

export function registerCardHandlers(_io: Server, socket: Socket): void {
  socket.on(CLIENT_EVENTS.PICK_CARD, (payload: PickCardPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = pickCard(room, player.playerId, Number(payload?.cardIndex));
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.CONFIRM_CARD, (payload: ConfirmCardPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = confirmCard(room, player.playerId, Number(payload?.cardIndex));
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.CANCEL_CARD, (payload: CancelCardPayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = cancelCard(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });

  socket.on(CLIENT_EVENTS.CONFIRM_ROLE, (payload: ConfirmRolePayload) => {
    withRoomAndPlayer(socket, payload?.roomId, (room, player) => {
      const result = confirmRole(room, player.playerId);
      if (!result.ok) emitError(socket, result.code!, result.message!);
    });
  });
}
