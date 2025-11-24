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
  const [flash, setFlash] = useState<"none" | "reach" | "bingo">("none");

  const socketControlsRef = useRef<SocketControls | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const statusRef = useRef({ reach: false, bingo: false });
  const chirpAudio = useMemo(() => new Audio("/sounds/longchirp.mp3"), []);
  const winAudio = useMemo(() => new Audio("/sounds/winAlert.mp3"), []);

  const evaluateStatus = useCallback(
    (nextChecked: Set<number>) => {
      const lines: number[][] = [];

      for (const row of card) {
        lines.push(row);
      }

      for (let col = 0; col < card[0].length; col += 1) {
        lines.push(card.map((row) => row[col]));
      }

      lines.push(card.map((row, index) => row[index]));
      lines.push(card.map((row, index) => row[card.length - 1 - index]));

      let hasReach = false;
      let hasBingo = false;

      for (const line of lines) {
        const count = line.filter((num) => nextChecked.has(num)).length;

        if (count === card.length) {
          hasBingo = true;
        } else if (count === card.length - 1) {
          hasReach = true;
        }
      }

      return { hasReach, hasBingo };
    },
    [card]
  );

  const triggerFlash = useCallback((type: "reach" | "bingo") => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }

    setFlash(type);

    flashTimeoutRef.current = window.setTimeout(() => {
      setFlash("none");
      flashTimeoutRef.current = null;
    }, 650);
  }, []);

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

      let nextChecked: Set<number> | null = null;

      setChecked((prev) => {
        const next = new Set(prev);
        openableNumbers.forEach((num) => next.add(num));
        nextChecked = next;
        return next;
      });

      if (!nextChecked) {
        return;
      }

      const { hasReach, hasBingo } = evaluateStatus(nextChecked);

      if (hasBingo && !statusRef.current.bingo) {
        statusRef.current = { reach: true, bingo: true };
        triggerFlash("bingo");
        winAudio.currentTime = 0;
        void winAudio.play();
      } else if (hasReach && !statusRef.current.reach) {
        statusRef.current = { ...statusRef.current, reach: true };
        triggerFlash("reach");
      }

      playAnimation();
    },
    [card, evaluateStatus, playAnimation, triggerFlash, winAudio]
  );

  useEffect(() => {
    socketControlsRef.current = createBingoSocket(SOCKET_URL, handleMessage);

    return () => {
      stopAnimation();
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
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
      {flash !== "none" && (
        <div className={`flash-overlay ${flash}`} aria-hidden="true" />
      )}
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
