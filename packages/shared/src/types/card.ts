export interface CardPublicState {
  cardIndex: number;
  isLocked: boolean;
  lockedByPlayerId: string | null;
  hoveringCount: number;
}
