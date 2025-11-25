import { useEffect, useRef, useState } from "react";
import type { SlotSpinPlan } from "../usecases/slotSpin";
import "../App.css";

type SlotModalProps = {
  open: boolean;
  plan: SlotSpinPlan | null;
  onConfirm: () => void;
};

export default function SlotModal({ open, plan, onConfirm }: SlotModalProps) {
  const [currentSymbol, setCurrentSymbol] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);

  useEffect(() => {
    if (!open || !plan) {
      return undefined;
    }

    setSpinning(true);
    frameIndexRef.current = 0;

    // Step through the planned frames with easing-aware delays to mirror a slot reel slowing down.
    const playFrame = () => {
      const frame = plan.frames[frameIndexRef.current];
      setCurrentSymbol(frame.symbolIndex);

      frameIndexRef.current += 1;

      if (frameIndexRef.current >= plan.frames.length) {
        setSpinning(false);
        return;
      }

      timeoutRef.current = window.setTimeout(playFrame, plan.frames[frameIndexRef.current].delayMs);
    };

    timeoutRef.current = window.setTimeout(playFrame, plan.frames[0]?.delayMs ?? 0);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [open, plan]);

  if (!open || !plan) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal slot-modal">
        <div className={`slot-window${spinning ? " slot-window--active" : ""}`}>
          <div className="slot-symbol">
            {currentSymbol ? (
              <img
                src={`/symbols/${currentSymbol}.png`}
                alt={`${currentSymbol}のシンボル`}
                className="symbol"
                loading="lazy"
              />
            ) : null}
          </div>
        </div>
        {!spinning ? (
          <button className="modal-button" type="button" onClick={onConfirm}>
            Please Click
          </button>
        ) : null}
      </div>
    </div>
  );
}
