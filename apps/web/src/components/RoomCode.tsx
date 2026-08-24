import { useState } from "react";
import { buildRoomUrl } from "../lib/roomUrl";

export function RoomCode({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState<"code" | "url" | null>(null);

  async function copy(text: string, kind: "code" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable; ignore silently
    }
  }

  return (
    <div className="room-code">
      <div className="room-code-value" onClick={() => copy(roomId, "code")}>
        {roomId}
        <span className="room-code-hint">{copied === "code" ? "已複製" : "點擊複製房號"}</span>
      </div>
      <button className="btn btn-secondary btn-small" onClick={() => copy(buildRoomUrl(roomId), "url")}>
        {copied === "url" ? "已複製網址" : "複製分享網址"}
      </button>
    </div>
  );
}
