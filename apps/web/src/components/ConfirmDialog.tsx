import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel = "確定", cancelLabel = "取消", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal>
      <p className="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog-actions">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
