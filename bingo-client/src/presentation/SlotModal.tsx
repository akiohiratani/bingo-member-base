type SlotModalProps = {
  /** 表示制御フラグ。true の間だけ演出を再生する。 */
  open: boolean;
  /** 現在表示する図柄。 */
  symbol: number | null;
};

export default function SlotModal({ open, symbol }: SlotModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-live="polite">
      <div className="modal slot-modal">
        <h2 className="modal-title">スロット抽選中...</h2>
        <p className="modal-body">受信した図柄が停止するまでお待ちください。</p>
        <div className="slot-window">
          {symbol ? (
            <img
              src={`/symbols/${symbol}.png`}
              alt={`${symbol}のシンボル`}
              className="slot-symbol"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
