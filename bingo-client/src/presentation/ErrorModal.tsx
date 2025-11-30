import "../App.css";

type ErrorModalProps = {
  open: boolean;
  message: string;
  onRetry: () => void;
};

export default function ErrorModal({ open, message, onRetry }: ErrorModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="socket-error-title"
      aria-describedby="socket-error-description"
    >
      <div className="modal modal--error">
        <h2 className="modal-title" id="socket-error-title">
          通信エラー
        </h2>
        <p className="modal-body" id="socket-error-description">
          {message || "ソケット通信に失敗しました。時間をおいて再接続をお試しください。"}
        </p>
        <p className="modal-body modal-body--subtle">
          「再接続」ボタンを押して接続を再試行してください。
        </p>
        <button className="modal-button modal-button--error" type="button" onClick={onRetry}>
          再接続
        </button>
      </div>
    </div>
  );
}
