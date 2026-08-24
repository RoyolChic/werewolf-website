export const CLIENT_EVENTS = {
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  CONFIRM_RECONNECT: "confirmReconnect",
  LEAVE_ROOM: "leaveRoom",
  KICK_PLAYER: "kickPlayer",
  PICK_CARD: "pickCard",
  CONFIRM_CARD: "confirmCard",
  CANCEL_CARD: "cancelCard",
  CONFIRM_ROLE: "confirmRole",
  SET_DAY_DISCUSSION_SECONDS: "setDayDiscussionSeconds",
  SET_WITCH_SELF_SAVE_RULE: "setWitchSelfSaveRule",
  SET_MAX_PLAYERS: "setMaxPlayers",
  SET_DEAD_VIEW_MODE: "setDeadViewMode",
  SKIP_DAY_DISCUSSION: "skipDayDiscussion",
  START_CARD_PICKING: "startCardPicking",
  WEREWOLF_VOTE: "werewolfVote",
  SEER_CHECK: "seerCheck",
  WITCH_ACTION: "witchAction",
  DAY_VOTE: "dayVote",
  REQUEST_ROOM_STATE: "requestRoomState",
} as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
