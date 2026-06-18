import "./ConfirmModal.css";

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Подтвердите действие",
  text = "Вы уверены, что хотите выполнить это действие?",
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" onMouseDown={onCancel}>
      <div className="confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className={danger ? "confirm-icon danger" : "confirm-icon"}>
          {danger ? "!" : "?"}
        </div>

        <h3>{title}</h3>
        <p>{text}</p>

        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            {cancelText}
          </button>

          <button
            type="button"
            className={danger ? "confirm-submit danger" : "confirm-submit"}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
