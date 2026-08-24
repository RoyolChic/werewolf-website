import type { CardPublicState } from "@kill-wolf/shared";

interface CardGridProps {
  cards: CardPublicState[];
  selfPlayerId: string;
  onPick: (cardIndex: number) => void;
  onConfirm: (cardIndex: number) => void;
  onCancel: () => void;
  hasConfirmed: boolean;
}

export function CardGrid({ cards, selfPlayerId, onPick, onConfirm, onCancel, hasConfirmed }: CardGridProps) {
  return (
    <div className="card-grid">
      {cards.map((card) => {
        const isMine = card.lockedByPlayerId === selfPlayerId;
        return (
          <div key={card.cardIndex} className={`face-down-card ${card.isLocked ? "face-down-card-locked" : ""} ${isMine ? "face-down-card-mine" : ""}`}>
            <div className="face-down-card-inner" onClick={() => !card.isLocked && !hasConfirmed && onPick(card.cardIndex)}>
              <span className="face-down-card-index">#{card.cardIndex + 1}</span>
              {card.hoveringCount > 0 && !card.isLocked && (
                <span className="face-down-card-hovering">{card.hoveringCount} 人選擇中</span>
              )}
              {card.isLocked && <span className="face-down-card-taken">{isMine ? "你已選擇" : "已被選走"}</span>}
            </div>
            {!card.isLocked && !hasConfirmed && (
              <button className="btn btn-small" onClick={() => onConfirm(card.cardIndex)}>
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
