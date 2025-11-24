import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateBingoCard } from "./domain/bingo";
import type { BingoCard, SocketMessage } from "./domain/bingo";
import { createBingoSocket } from "./infrastructure/socketClient";
import type { SocketControls } from "./infrastructure/socketClient";
import WelcomeModal from "./presentation/WelcomeModal";
import {
  progressBingo,
  type BingoState,
  type FlashType,
  type BingoStatus,
} from "./usecases/bingoProgress";
import "./App.css";

const SOCKET_URL =
  "wss://kkblt3dovh.execute-api.ap-northeast-1.amazonaws.com/AkioHiratani?role=member";

export default function App() {
  const [card] = useState<BingoCard>(() => generateBingoCard());
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [animationActive, setAnimationActive] = useState(false);
  const [flashType, setFlashType] = useState<FlashType | null>(null);
  const [bingoStatus, setBingoStatus] = useState<BingoStatus>("none");

  const socketControlsRef = useRef<SocketControls | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const bingoStateRef = useRef<BingoState>({ checked: new Set(), status: "none" });
  const chirpAudio = useMemo(() => new Audio("/sounds/longchirp.mp3"), []);
  const winAudio = useMemo(() => new Audio("/sounds/winAlert.mp3"), []);

  const stopAnimation = useCallback(() => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  const stopFlash = useCallback(() => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, []);

  const triggerFlash = useCallback(
    (type: FlashType) => {
      stopFlash();
      setFlashType(type);
      flashTimeoutRef.current = window.setTimeout(() => {
        setFlashType(null);
        flashTimeoutRef.current = null;
      }, 500);
    },
    [stopFlash]
  );

  const playAnimation = useCallback(() => {
    stopAnimation();
    setAnimationActive(true);
    chirpAudio.currentTime = 0;
    void chirpAudio.play();
    animationTimeoutRef.current = window.setTimeout(() => {
      setAnimationActive(false);
      animationTimeoutRef.current = null;
    }, 3000);
  }, [chirpAudio, stopAnimation]);

  const handleMessage = useCallback(
    (message: SocketMessage) => {
      const result = progressBingo(message, card, bingoStateRef.current);

      if (!result) {
        return;
      }

      const { nextState, effects } = result;
      bingoStateRef.current = nextState;
      setChecked(nextState.checked);
      setBingoStatus(nextState.status);

      if (effects.triggerAnimation) {
        playAnimation();
      }

      if (effects.flash) {
        triggerFlash(effects.flash);
      }

      if (effects.playWinSound) {
        winAudio.currentTime = 0;
        void winAudio.play();
      }
    },
    [card, playAnimation, triggerFlash, winAudio]
  );

  useEffect(() => {
    socketControlsRef.current = createBingoSocket(SOCKET_URL, handleMessage);

    return () => {
      stopAnimation();
      stopFlash();
      socketControlsRef.current?.stop();
    };
  }, [handleMessage, stopAnimation, stopFlash]);

  const handleCloseWelcome = () => {
    setWelcomeOpen(false);
    socketControlsRef.current?.start();
  };

  return (
    <div className="app" data-bingo-status={bingoStatus}>
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
      {flashType ? (
        <div
          className={`flash-overlay ${flashType === "reach" ? "flash-reach" : "flash-bingo"}`}
          aria-hidden="true"
        />
      ) : null}
      <h1 className="title">Bingo Card</h1>
      <div
        className={`card-grid${animationActive ? " animating" : ""}`}
        role="grid"
        aria-label="ビンゴカード"
      >
        {card.flat().map((num) => {
          const isChecked = checked.has(num);

          return (
            <div
              key={num}
              className={`card-cell${isChecked ? " checked" : ""}`}
              role="gridcell"
              aria-checked={isChecked}
            >
              <img
                src={`/symbols/${num}.png`}
                alt={`${num}のシンボル`}
                className="symbol"
                loading="lazy"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
