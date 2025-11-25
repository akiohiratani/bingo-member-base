import { useEffect, useMemo, useRef, useState } from "react";
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
  const loopTimeoutRef = useRef<number | null>(null);
  const spinAudio = useMemo(() => {
    const audio = new Audio("/sounds/spinStart.mp3");
    audio.preload = "auto";
    return audio;
  }, []);

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

  useEffect(() => {
    if (!spinning) {
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }

      spinAudio.pause();
      spinAudio.currentTime = 0;
      return undefined;
    }

    let cancelled = false;

    const handleEnded = () => {
      loopTimeoutRef.current = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        spinAudio.currentTime = 0;
        void spinAudio.play();
      }, 1000);
    };

    spinAudio.currentTime = 0;
    void spinAudio.play();
    spinAudio.addEventListener("ended", handleEnded);

    return () => {
      cancelled = true;

      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }

      spinAudio.removeEventListener("ended", handleEnded);
      spinAudio.pause();
      spinAudio.currentTime = 0;
    };
  }, [spinAudio, spinning]);

  if (!open || !plan) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal slot-modal">
        <h2 className="modal-title">抽選中...</h2>
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
