import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractOpenableNumbers, generateBingoCard } from "./domain/bingo";
import type { BingoCard, SocketMessage } from "./domain/bingo";
import { loadRuntimeConfig, type RuntimeConfig } from "./infrastructure/runtimeConfig";
import { createBingoSocket } from "./infrastructure/socketClient";
import type { SocketControls } from "./infrastructure/socketClient";
import SlotModal from "./presentation/SlotModal";
import WelcomeModal from "./presentation/WelcomeModal";
import {
  progressBingo,
  type BingoState,
  type FlashType,
  type BingoStatus,
  findReachTargets,
} from "./usecases/bingoProgress";
import { warmAudioElement } from "./usecases/audio";
import { createSlotPlanFromMessage, type SlotSpinPlan } from "./usecases/slotSpin";
import "./App.css";

const reachEmblemImages = [
  "/direction/reach_1.png",
  "/direction/reach_2.png",
  "/direction/reach_3.png",
];

const getRandomReachEmblem = () => {
  const randomIndex = Math.floor(Math.random() * reachEmblemImages.length);

  return reachEmblemImages[randomIndex];
};

export default function App() {
  const [card] = useState<BingoCard>(() => generateBingoCard());
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [animationActive, setAnimationActive] = useState(false);
  const [flashType, setFlashType] = useState<FlashType | null>(null);
  const [bingoStatus, setBingoStatus] = useState<BingoStatus>("none");
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotPlan, setSlotPlan] = useState<SlotSpinPlan | null>(null);
const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
const [configError, setConfigError] = useState<string | null>(null);
const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [reachEmblemSrc, setReachEmblemSrc] = useState<string>(() =>
    getRandomReachEmblem()
  );

  const socketControlsRef = useRef<SocketControls | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const bingoStateRef = useRef<BingoState>({
    checked: new Set(),
    status: "none",
    reachLineCount: 0,
  });
  const pendingMessageRef = useRef<SocketMessage | null>(null);
  const chirpAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const missAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockingRef = useRef(false);

  useEffect(() => {
    const createAudio = (src: string) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      return audio;
    };

    chirpAudioRef.current = createAudio("/sounds/longchirp.mp3");
    winAudioRef.current = createAudio("/sounds/winAlert.mp3");
    missAudioRef.current = createAudio("/sounds/bad.mp3");
  }, []);

  const unlockAudioPlayback = useCallback(async () => {
    if (audioUnlocked || audioUnlockingRef.current) {
      return;
    }

    audioUnlockingRef.current = true;

    const audios = [
      chirpAudioRef.current,
      winAudioRef.current,
      missAudioRef.current,
    ].filter((audio): audio is HTMLAudioElement => Boolean(audio));

    const warmResults = await Promise.all(
      audios.map((audio) => warmAudioElement(audio))
    );

    audioUnlockingRef.current = false;
    setAudioUnlocked(warmResults.some(Boolean));
  }, [audioUnlocked]);

  useEffect(() => {
    let cancelled = false;

    loadRuntimeConfig()
      .then((config) => {
        if (cancelled) {
          return;
        }

        setRuntimeConfig(config);
      })
      .catch((error) => {
        console.error(error);
        if (cancelled) {
          return;
        }

        setConfigError("設定ファイルの読み込みに失敗しました。管理者に連絡してください。");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUserInput = () => {
      void unlockAudioPlayback();
    };

    window.addEventListener("pointerdown", handleUserInput, { once: true });
    window.addEventListener("keydown", handleUserInput, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleUserInput);
      window.removeEventListener("keydown", handleUserInput);
    };
  }, [unlockAudioPlayback]);

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

  const reachTargets = useMemo(() => {
    if (bingoStatus !== "reach") {
      return new Set<number>();
    }

    return findReachTargets(card, checked);
  }, [bingoStatus, card, checked]);

  const triggerFlash = useCallback(
    (type: FlashType) => {
      stopFlash();
      if (type === "reach") {
        setReachEmblemSrc(getRandomReachEmblem());
      }
      setFlashType(type);
      flashTimeoutRef.current = window.setTimeout(() => {
        setFlashType(null);
        flashTimeoutRef.current = null;
      }, 3000);
    },
    [stopFlash]
  );

  const playAnimation = useCallback(() => {
    stopAnimation();
    setAnimationActive(true);
    if (chirpAudioRef.current) {
      chirpAudioRef.current.currentTime = 0;
      void chirpAudioRef.current.play();
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setAnimationActive(false);
      animationTimeoutRef.current = null;
    }, 3000);
  }, [stopAnimation]);

  const applyBingoProgress = useCallback(
    (message: SocketMessage) => {
      // Delegate bingo status progression to the use case so the UI only orchestrates interactions.
      const result = progressBingo(message, card, bingoStateRef.current);

      if (!result) {
        return;
      }

      const { nextState, effects } = result;
      bingoStateRef.current = nextState;
      setChecked(nextState.checked);
      setBingoStatus(nextState.status);

      if (nextState.status === "bingo") {
        socketControlsRef.current?.stop();
      }

      if (effects.triggerAnimation) {
        playAnimation();
      }

      if (effects.flash) {
        triggerFlash(effects.flash);
      }

      if (effects.playWinSound && winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        void winAudioRef.current.play();
      }
    },
    [card, playAnimation, triggerFlash]
  );

  const handleMessage = useCallback(
    (message: SocketMessage) => {
      if (bingoStateRef.current.status === "bingo") {
        return;
      }

      // Detect a winIndex and start the slot presentation before applying the result to the card.
      const plannedSlot = createSlotPlanFromMessage(message);

      if (plannedSlot) {
        pendingMessageRef.current = message;
        setSlotPlan(plannedSlot);
        setSlotOpen(true);
        return;
      }

      applyBingoProgress(message);
    },
    [applyBingoProgress]
  );

  useEffect(() => {
    if (!runtimeConfig) {
      return;
    }

    socketControlsRef.current = createBingoSocket(
      runtimeConfig.socketUrl,
      handleMessage
    );

    return () => {
      stopAnimation();
      stopFlash();
      socketControlsRef.current?.stop();
    };
  }, [handleMessage, runtimeConfig, stopAnimation, stopFlash]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!welcomeOpen && runtimeConfig) {
      socketControlsRef.current?.start();
    }
  }, [runtimeConfig, welcomeOpen]);

  const handleCloseWelcome = () => {
    void unlockAudioPlayback();
    setWelcomeOpen(false);
    socketControlsRef.current?.start();
  };

  const handleConfirmSlotResult = () => {
    // Apply the pending bingo update only after the user acknowledges the revealed symbol.
    const pending = pendingMessageRef.current;
    pendingMessageRef.current = null;
    setSlotOpen(false);
    setSlotPlan(null);

    if (pending) {
      const openableNumbers = extractOpenableNumbers(pending, card);

      if (openableNumbers.length === 0) {
        if (missAudioRef.current) {
          missAudioRef.current.currentTime = 0;
          void missAudioRef.current.play();
        }
        return;
      }

      applyBingoProgress(pending);
    }
  };

  return (
    <div className="app" data-bingo-status={bingoStatus}>
      {configError ? (
        <div className="config-error" role="alert">
          {configError}
        </div>
      ) : null}
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
      <SlotModal
        open={slotOpen}
        plan={slotPlan}
        audioUnlocked={audioUnlocked}
        onConfirm={handleConfirmSlotResult}
      />
      {flashType ? (
        <div
          className={`flash-overlay ${flashType === "reach" ? "flash-reach" : "flash-bingo"}`}
          aria-hidden="true"
        >
          <div
            className={`flash-emblem ${
              flashType === "reach" ? "flash-emblem--reach" : "flash-emblem--bingo"
            }`}
            style={
              flashType === "reach"
                ? { backgroundImage: `url(${reachEmblemSrc})` }
                : undefined
            }
          />
        </div>
      ) : null}
      <h1 className={`title${bingoStatus === "bingo" ? " rainbow" : ""}`}>BINGO</h1>
      <div
        className={`card-grid${animationActive ? " animating" : ""}${bingoStatus === "bingo" ? " bingo" : ""}`}
        role="grid"
        aria-label="ビンゴカード"
      >
        {card.flat().map((num) => {
          const isChecked = checked.has(num);
          const isReachTarget = !isChecked && reachTargets.has(num);

          return (
            <div
              key={num}
              className={`card-cell${isChecked ? " checked" : ""}${isReachTarget ? " reach-target" : ""}`}
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
