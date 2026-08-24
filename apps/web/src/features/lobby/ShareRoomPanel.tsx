import { RoomCode } from "../../components/RoomCode";

export function ShareRoomPanel({ roomId }: { roomId: string }) {
  return (
    <section className="card">
      <h2>分享房間</h2>
      <RoomCode roomId={roomId} />
    </section>
  );
}
