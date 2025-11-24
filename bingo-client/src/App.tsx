import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractOpenableNumbers, generateBingoCard } from "./domain/bingo";
import type { BingoCard, SocketMessage } from "./domain/bingo";
import { createBingoSocket } from "./infrastructure/socketClient";
import type { SocketControls } from "./infrastructure/socketClient";
import WelcomeModal from "./presentation/WelcomeModal";
import "./App.css";

const SOCKET_URL =
  "wss://kkblt3dovh.execute-api.ap-northeast-1.amazonaws.com/AkioHiratani?role=member";

export default function App() {
  const [card] = useState<BingoCard>(() => generateBingoCard());
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [animationActive, setAnimationActive] = useState(false);

  const socketControlsRef = useRef<SocketControls | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const chirpAudio = useMemo(() => new Audio("/sounds/longchirp.mp3"), []);

  const stopAnimation = useCallback(() => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

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
      const openableNumbers = extractOpenableNumbers(message, card);

      if (openableNumbers.length === 0) {
        return;
      }

      setChecked((prev) => {
        const next = new Set(prev);
        openableNumbers.forEach((num) => next.add(num));
        return next;
      });

      playAnimation();
    },
    [card, playAnimation]
  );

  useEffect(() => {
    socketControlsRef.current = createBingoSocket(SOCKET_URL, handleMessage);

    return () => {
      stopAnimation();
      socketControlsRef.current?.stop();
    };
  }, [handleMessage, stopAnimation]);

  const handleCloseWelcome = () => {
    setWelcomeOpen(false);
    socketControlsRef.current?.start();
  };

  return (
    <div className="app">
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
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
