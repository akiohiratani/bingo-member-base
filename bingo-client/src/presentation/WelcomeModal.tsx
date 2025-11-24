import "../App.css";

type WelcomeModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 className="modal-title">Welcome!</h2>
        <p className="modal-body">
          ビンゴの進行を開始する前に、準備が整ったらモーダルを閉じてください。
        </p>
        <button className="modal-button" type="button" onClick={onClose}>
          はじめる
        </button>
      </div>
    </div>
  );
}
