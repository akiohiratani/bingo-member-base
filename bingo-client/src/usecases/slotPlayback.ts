import type { SlotPlan } from "./slotPlan";

export type CancellablePromise = {
  /** 完了まで待機する Promise。 */
  promise: Promise<void>;
  /** 実行中のタイマーを停止し、後続処理を中断する。 */
  cancel: () => void;
};

/**
 * プレゼンテーション層から setTimeout を排除するため、
 * スロット計画を順次再生する責務をユースケース層に持たせる。
 * 指定されたコールバックに図柄を通知し、全フレーム完了で解決する Promise を返す。
 */
export function playSlotPlan(plan: SlotPlan, onFrame: (symbol: number) => void): CancellablePromise {
  let timerId: number | null = null;
  let stopped = false;
  let resolvePromise: (() => void) | null = null;

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
    let frameIndex = 0;

    const step = () => {
      if (stopped) {
        resolve();
        return;
      }

      const frame = plan.frames[frameIndex];

      if (!frame) {
        resolve();
        return;
      }

      onFrame(frame.symbol);
      frameIndex += 1;

      timerId = window.setTimeout(() => {
        if (frameIndex >= plan.frames.length) {
          resolve();
          return;
        }

        step();
      }, frame.durationMs);
    };

    step();
  });

  const cancel = () => {
    stopped = true;

    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }

    resolvePromise?.();
  };

  return { promise, cancel };
}

/**
 * UI 外の待機を Promise として提供することで、
 * プレゼンテーション層が setTimeout を直接扱うことを避ける。
 */
export function delayMs(durationMs: number): CancellablePromise {
  let timerId: number | null = null;
  let resolvePromise: (() => void) | null = null;

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
    timerId = window.setTimeout(() => {
      resolve();
    }, durationMs);
  });

  const cancel = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }

    resolvePromise?.();
  };

  return { promise, cancel };
}
