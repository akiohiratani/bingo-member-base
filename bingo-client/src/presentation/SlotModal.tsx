type SlotModalProps = {
  /** 表示制御フラグ。true の間だけ演出を再生する。 */
  open: boolean;
  /** 現在表示する図柄。 */
  symbol: number | null;
  /** 停止後にビンゴへ反映できる状態かどうか。 */
  canApply: boolean;
  /** ボタン多重押下を防ぐためのローディング状態。 */
  applying: boolean;
  /** 停止結果をビンゴカードへ反映する操作。 */
  onApply: () => void;
};

export default function SlotModal({ open, symbol, canApply, applying, onApply }: SlotModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-live="polite">
      <div className="modal slot-modal">
        <h2 className="modal-title">スロット抽選中...</h2>
        <p className="modal-body">
          {canApply ? "停止しました。図柄を確認して反映ボタンを押してください。" : "受信した図柄が停止するまでお待ちください。"}
        </p>
        <div className="slot-window">
          {symbol ? (
            <img
              src={`/symbols/${symbol}.png`}
              alt={`${symbol}のシンボル`}
              className="slot-symbol"
            />
          ) : null}
        </div>
        <div className="slot-actions">
          <button
            type="button"
            className="modal-button"
            onClick={onApply}
            disabled={!canApply || applying}
          >
            {applying ? "反映中..." : "ビンゴカードに反映"}
          </button>
        </div>
      </div>
    </div>
  );
}
