import { CARD_BACK_IMAGE_PATH, type CardPublicState } from "@kill-wolf/shared";
import { useAudio } from "../../lib/audio/audioContext";

interface CardGridProps {
  cards: CardPublicState[];
  selfPlayerId: string;
  onPick: (cardIndex: number) => void;
  onConfirm: (cardIndex: number) => void;
  onCancel: () => void;
  hasConfirmed: boolean;
}

export function CardGrid({ cards, selfPlayerId, onPick, onConfirm, onCancel, hasConfirmed }: CardGridProps) {
  const { playCue } = useAudio();

  return (
    <div className="card-grid">
      {cards.map((card) => {
        const isMine = card.lockedByPlayerId === selfPlayerId;
        return (
          <div key={card.cardIndex} className={`face-down-card ${card.isLocked ? "face-down-card-locked" : ""} ${isMine ? "face-down-card-mine" : ""}`}>
            <div
              className="face-down-card-inner"
              style={{ backgroundImage: `url(${CARD_BACK_IMAGE_PATH}), linear-gradient(135deg, var(--color-primary), #3a2fbf)` }}
              onClick={() => {
                if (card.isLocked || hasConfirmed) return;
                playCue("ui.role.select");
                onPick(card.cardIndex);
              }}
            >
              {card.hoveringCount > 0 && !card.isLocked && (
                <span className="face-down-card-hovering">{card.hoveringCount} 人選擇中</span>
              )}
              {card.isLocked && <span className="face-down-card-taken">{isMine ? "你已選擇" : "已被選走"}</span>}
            </div>
            {!card.isLocked && !hasConfirmed && (
              <button
                className="btn btn-primary btn-small"
                onClick={() => {
                  playCue("ui.role.confirm");
                  onConfirm(card.cardIndex);
                }}
              >
                確認這張牌
              </button>
            )}
            {isMine && (
              <button className="btn btn-secondary btn-small" onClick={onCancel}>
                取消重選
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
