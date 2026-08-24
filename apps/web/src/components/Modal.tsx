import type { ReactNode } from "react";

export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">{children}</div>
    </div>
  );
}
