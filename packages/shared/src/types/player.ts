export interface PlayerPublicState {
  playerId: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  isAlive: boolean;
  hasPickedCard: boolean;
}
