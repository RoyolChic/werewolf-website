export const SERVER_EVENTS = {
  ROOM_CREATED: "roomCreated",
  ROOM_JOINED: "roomJoined",
  RECONNECT_CONFIRMATION_REQUIRED: "reconnectConfirmationRequired",
  ROOM_STATE_UPDATED: "roomStateUpdated",
  PRIVATE_STATE_UPDATED: "privateStateUpdated",
  PHASE_CHANGED: "phaseChanged",
  ACTION_RESULT: "actionResult",
  DAY_ANNOUNCEMENT: "dayAnnouncement",
  VOTE_RESULT: "voteResult",
  GAME_OVER: "gameOver",
  ROOM_CLOSED: "roomClosed",
  PLAYER_KICKED: "playerKicked",
  ERROR: "error",
} as const;

export type ServerEventName = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
