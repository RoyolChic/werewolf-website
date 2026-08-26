const LIGHTNESS = 70;
const CHROMA = 0.16;
const GOLDEN_ANGLE = 137.508;

export interface PlayerColorSet {
  /** Solid, opaque color -- seat badges, borders, text. Light enough to pair with dark ink text. */
  solid: string;
  /** Translucent variants for glow/shadow layering (low/high alpha for a pulsing animation). */
  glowLow: string;
  glowHigh: string;
}

/**
 * A player's identity color, deterministic from their seat index (0-based, i.e. their position in
 * `publicState.players`) so every client renders the same color for the same player without needing
 * a color field plumbed through the server. Hues are spaced by the golden angle rather than picked
 * from a fixed palette so neighboring seats stay visually distinct at any table size.
 */
export function getPlayerColor(seatIndex: number): PlayerColorSet {
  const hue = (seatIndex * GOLDEN_ANGLE) % 360;
  return {
    solid: `oklch(${LIGHTNESS}% ${CHROMA} ${hue})`,
    glowLow: `oklch(${LIGHTNESS}% ${CHROMA} ${hue} / 0.55)`,
    glowHigh: `oklch(${LIGHTNESS}% ${CHROMA} ${hue} / 0.9)`,
  };
}
