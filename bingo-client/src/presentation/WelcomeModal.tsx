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
          準備が完了しましたら、下の「はじめる」ボタンを押してください。
        </p>
        <p className="modal-body">
          ※ゲーム中は、電源を切ったり画面を切り替えたりしないでください。
        </p>
        <button className="modal-button" type="button" onClick={onClose}>
          はじめる
        </button>
      </div>
    </div>
  );
}
