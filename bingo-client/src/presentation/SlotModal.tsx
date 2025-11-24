import { useEffect, useRef, useState } from "react";
import type { SlotPlan } from "../usecases/slotPlan";

type SlotModalProps = {
  /** 表示制御フラグ。true の間だけ演出を再生する。 */
  open: boolean;
  /** スロット演出の計画。null の場合は表示しない。 */
  plan: SlotPlan | null;
  /** 演出が完了した際に呼び出されるコールバック。 */
  onComplete: () => void;
};

export default function SlotModal({ open, plan, onComplete }: SlotModalProps) {
  const [currentSymbol, setCurrentSymbol] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !plan) {
      return undefined;
    }

    // 事前計算されたフレームを順に再生し、UI 側では制御処理を持たない。
    let frameIndex = 0;

    const playFrame = () => {
      const frame = plan.frames[frameIndex];
      if (!frame) {
        return;
      }

      setCurrentSymbol(frame.symbol);
      const isLastFrame = frameIndex === plan.frames.length - 1;
      frameIndex += 1;

      timerRef.current = window.setTimeout(() => {
        if (isLastFrame) {
          onComplete();
          return;
        }

        playFrame();
      }, frame.durationMs);
    };

    playFrame();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, plan, onComplete]);

  if (!open || !plan) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-live="polite">
      <div className="modal slot-modal">
        <h2 className="modal-title">スロット抽選中...</h2>
        <p className="modal-body">受信した図柄が停止するまでお待ちください。</p>
        <div className="slot-window">
          {currentSymbol ? (
            <img
              src={`/symbols/${currentSymbol}.png`}
              alt={`${currentSymbol}のシンボル`}
              className="slot-symbol"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
