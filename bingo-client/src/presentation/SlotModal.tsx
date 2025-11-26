import { useCallback, useEffect, useRef, useState } from "react";
import type { SlotSpinPlan } from "../usecases/slotSpin";
import { warmAudioElement } from "../usecases/audio";
import "../App.css";

type SlotModalProps = {
  open: boolean;
  plan: SlotSpinPlan | null;
  audioUnlocked: boolean;
  onConfirm: () => void;
};

export default function SlotModal({
  open,
  plan,
  audioUnlocked,
  onConfirm,
}: SlotModalProps) {
  const [currentSymbol, setCurrentSymbol] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const frameIndexRef = useRef(0);
  const loopTimeoutRef = useRef<number | null>(null);
  const autoConfirmTimeoutRef = useRef<number | null>(null);
  const progressAnimationRef = useRef<number | null>(null);
  const confirmationSentRef = useRef(false);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);

  const clearAutoConfirmTimeout = useCallback(() => {
    if (autoConfirmTimeoutRef.current) {
      window.clearTimeout(autoConfirmTimeoutRef.current);
      autoConfirmTimeoutRef.current = null;
    }
  }, []);

  const confirmResult = useCallback(() => {
    if (confirmationSentRef.current) {
      return;
    }

    confirmationSentRef.current = true;
    setProgress(100);
    clearAutoConfirmTimeout();
    if (progressAnimationRef.current !== null) {
      window.cancelAnimationFrame(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }
    onConfirm();
  }, [clearAutoConfirmTimeout, onConfirm]);

  useEffect(() => {
    const audio = new Audio("/sounds/spinStart.mp3");
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    spinAudioRef.current = audio;
  }, []);

  useEffect(() => {
    if (!audioUnlocked || !spinAudioRef.current) {
      return;
    }

    void warmAudioElement(spinAudioRef.current);
  }, [audioUnlocked]);

  useEffect(() => {
    confirmationSentRef.current = false;
    setProgress(0);
    clearAutoConfirmTimeout();

    if (!open || !plan) {
      return undefined;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
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

      clearAutoConfirmTimeout();
    };
  }, [clearAutoConfirmTimeout, open, plan]);

  useEffect(() => {
    if (!spinning) {
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }

      spinAudioRef.current?.pause();
      if (spinAudioRef.current) {
        spinAudioRef.current.currentTime = 0;
      }
      return undefined;
    }

    let cancelled = false;

    const handleEnded = () => {
      loopTimeoutRef.current = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (spinAudioRef.current) {
          spinAudioRef.current.currentTime = 0;
          void spinAudioRef.current.play();
        }
      }, 1000);
    };

    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      void spinAudioRef.current.play();
      spinAudioRef.current.addEventListener("ended", handleEnded);
    }

    return () => {
      cancelled = true;

      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }

      spinAudioRef.current?.removeEventListener("ended", handleEnded);
      spinAudioRef.current?.pause();
      if (spinAudioRef.current) {
        spinAudioRef.current.currentTime = 0;
      }
    };
  }, [spinning]);

  useEffect(() => {
    if (!open || !plan || spinning) {
      setProgress(0);
      if (progressAnimationRef.current !== null) {
        window.cancelAnimationFrame(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
      clearAutoConfirmTimeout();
      return undefined;
    }

    autoConfirmTimeoutRef.current = window.setTimeout(() => {
      confirmResult();
    }, 4000);

    const durationMs = 3700;
    const start = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - start;
      const nextProgress = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(nextProgress);

      if (nextProgress < 100 && !confirmationSentRef.current) {
        progressAnimationRef.current = window.requestAnimationFrame(animate);
      }
    };

    progressAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (progressAnimationRef.current !== null) {
        window.cancelAnimationFrame(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
      clearAutoConfirmTimeout();
    };
  }, [clearAutoConfirmTimeout, confirmResult, open, plan, spinning]);

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
          <button className="modal-button" type="button" onClick={confirmResult}>
            <span className="modal-button__label">Please Click</span>
            <span className="modal-button__progress" aria-hidden="true">
              <span
                className="modal-button__progress-bar"
                style={{ width: `${progress}%` }}
              />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
