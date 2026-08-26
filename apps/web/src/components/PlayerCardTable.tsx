import type { CSSProperties, ReactNode } from "react";
import { CARD_BACK_IMAGE_PATH, getRoleImagePath, type PlayerPublicState, type Role } from "@kill-wolf/shared";
import { withBase } from "../lib/assetPath";
import { getPlayerColor } from "../lib/playerColors";

export interface PlayerCardTableExtraCard {
  id: string;
  label: string;
  disabled?: boolean;
}

interface PlayerCardTableProps {
  players: PlayerPublicState[];
  selfPlayerId: string;
  /** The viewer's own role, shown face-up on their own card; null before it's known. */
  selfRole: Role | null;
  selfRoleVariantIndex: number;
  centerContent?: ReactNode;
  /** Hint text (e.g. "your turn to speak") shown between the others' row and the self row. */
  statusText?: string | null;
  selectableIds?: ReadonlySet<string>;
  selectedIds?: ReadonlySet<string>;
  highlightIds?: ReadonlySet<string>;
  /** Players who currently hold the floor -- rendered larger with a glowing border. */
  speakingIds?: ReadonlySet<string>;
  /** Small overlay label per card (e.g. the seat numbers currently targeting that player) --
   * only ever populated for viewers who are allowed to see it (the werewolf pack). */
  cardBadges?: ReadonlyMap<string, string>;
  /** Text shown under a specific player's name (e.g. "狼隊友") -- unlike centerContent, this is
   * per-card, so each labeled player's own card carries its own caption. */
  cardCaptions?: ReadonlyMap<string, string>;
  extraCard?: PlayerCardTableExtraCard | null;
  onSelect?: (id: string) => void;
  /** True while it's the viewer's own turn to hold the floor -- makes the status line hard to miss. */
  isSelfTurn?: boolean;
}

/** Every player's identity color (by seat index) as CSS custom properties, so plain CSS can pick
 * them up for badges, borders, and the speaking glow without recomputing per stylesheet rule. */
function seatColorStyle(seatIndex: number): CSSProperties {
  const color = getPlayerColor(seatIndex);
  return {
    "--player-color": color.solid,
    "--player-glow-low": color.glowLow,
    "--player-glow-high": color.glowHigh,
  } as CSSProperties;
}

/**
 * The shared "card table": everyone else's face-down card in one row (seat number on the back),
 * then the viewer's own card below, face-up with their actual role art -- a player never needs to
 * guess their own role, only everyone else's. Which cards are clickable (and what a click does)
 * is entirely up to the caller via selectableIds/onSelect -- this component only renders and
 * reports clicks.
 */
export function PlayerCardTable({
  players,
  selfPlayerId,
  selfRole,
  selfRoleVariantIndex,
  centerContent,
  statusText,
  selectableIds,
  selectedIds,
  highlightIds,
  speakingIds,
  cardBadges,
  cardCaptions,
  extraCard,
  onSelect,
  isSelfTurn,
}: PlayerCardTableProps) {
  const self = players.find((p) => p.playerId === selfPlayerId) ?? null;
  const others = players.filter((p) => p.playerId !== selfPlayerId);

  function statusClassNames(playerId: string, isAlive: boolean) {
    const clickable = Boolean(onSelect) && (selectableIds?.has(playerId) ?? false);
    return [
      !isAlive ? "game-card-dead" : "",
      clickable ? "game-card-clickable" : "",
      selectedIds?.has(playerId) ? "game-card-selected" : "",
      highlightIds?.has(playerId) ? "game-card-highlight" : "",
      speakingIds?.has(playerId) ? "game-card-speaking" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function handlersFor(playerId: string) {
    const clickable = Boolean(onSelect) && (selectableIds?.has(playerId) ?? false);
    return {
      onClick: clickable ? () => onSelect?.(playerId) : undefined,
      role: clickable ? ("button" as const) : undefined,
      tabIndex: clickable ? 0 : undefined,
    };
  }

  return (
    <div className="game-table">
      <div className="game-table-row">
        {others.map((player) => {
          const seatNumber = players.indexOf(player) + 1;
          return (
            <div
              key={player.playerId}
              className={`game-card ${statusClassNames(player.playerId, player.isAlive)}`}
              style={seatColorStyle(seatNumber - 1)}
              {...handlersFor(player.playerId)}
            >
              <div className="game-card-face" style={{ backgroundImage: `url(${withBase(CARD_BACK_IMAGE_PATH)})` }}>
                <span className="game-card-seat">{seatNumber}</span>
                {!player.isConnected && <span className="game-card-offline" title="離線" />}
                {!player.isAlive && <span className="game-card-dead-mark">✕</span>}
                {cardBadges?.has(player.playerId) && <span className="game-card-vote-mark">{cardBadges.get(player.playerId)}</span>}
              </div>
              <span className="game-card-name">{player.name}</span>
              {cardCaptions?.has(player.playerId) && <span className="game-card-caption">{cardCaptions.get(player.playerId)}</span>}
            </div>
          );
        })}
        {extraCard && (
          <div
            className={`game-card game-card-extra ${extraCard.disabled ? "" : "game-card-clickable"}`}
            onClick={extraCard.disabled ? undefined : () => onSelect?.(extraCard.id)}
            role={extraCard.disabled ? undefined : "button"}
            tabIndex={extraCard.disabled ? undefined : 0}
          >
            <div className="game-card-face game-card-face-extra">
              <span className="game-card-extra-label">{extraCard.label}</span>
            </div>
          </div>
        )}
      </div>
      {centerContent != null && <div className="game-table-center">{centerContent}</div>}
      {statusText && (
        <p className={isSelfTurn ? "game-table-status game-table-status-self" : "muted-text game-table-status"} style={self ? seatColorStyle(players.indexOf(self)) : undefined}>
          {statusText}
        </p>
      )}
      {self && (
        <div className="game-table-self-row">
          <div
            className={`game-card game-card-self game-card-large ${statusClassNames(self.playerId, self.isAlive)}`}
            style={seatColorStyle(players.indexOf(self))}
            {...handlersFor(self.playerId)}
          >
            <div
              className="game-card-face game-card-face-up"
              style={selfRole ? { backgroundImage: `url(${withBase(getRoleImagePath(selfRole, selfRoleVariantIndex))})` } : undefined}
            >
              <span className="game-card-seat">{players.indexOf(self) + 1}</span>
              {!self.isConnected && <span className="game-card-offline" title="離線" />}
              {!self.isAlive && <span className="game-card-dead-mark">✕</span>}
              {cardBadges?.has(self.playerId) && <span className="game-card-vote-mark">{cardBadges.get(self.playerId)}</span>}
            </div>
            <span className="game-card-name">{self.name}（你）</span>
          </div>
        </div>
      )}
    </div>
  );
}
