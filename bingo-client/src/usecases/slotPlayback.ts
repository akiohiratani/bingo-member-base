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
  let rafId: number | null = null;
  let stopped = false;
  let resolvePromise: (() => void) | null = null;
  let timeoutId: number | null = null;

  const promise = new Promise<void>((resolve) => {
    const finish = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      resolve();
    };

    resolvePromise = finish;

    // 経過時間を監視し、requestAnimationFrame でフレームを進行させることで、
    // タイマーパケットの取りこぼしによるフリーズを防ぐ。
    let frameIndex = 0;
    let elapsedForFrame = 0;
    let lastTimestamp: number | null = null;

    // 最初のフレームは即座に描画する。
    if (plan.frames[frameIndex]) {
      onFrame(plan.frames[frameIndex].symbol);
    }

    const step = (timestamp: number) => {
      if (stopped) {
        finish();
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        rafId = window.requestAnimationFrame(step);
        return;
      }

      const frame = plan.frames[frameIndex];

      if (!frame) {
        finish();
        return;
      }

      elapsedForFrame += timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (elapsedForFrame >= frame.durationMs) {
        frameIndex += 1;
        elapsedForFrame = 0;

        if (frameIndex >= plan.frames.length) {
          finish();
          return;
        }

        onFrame(plan.frames[frameIndex].symbol);
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);

    // タブ非アクティブなどで requestAnimationFrame が停止した場合でも、
    // 合計演出時間を上限として強制的に完了させ、モーダルが閉じないリスクを排除する。
    timeoutId = window.setTimeout(() => {
      stopped = true;
      finish();
    }, plan.totalDurationMs + 500);
  });

  const cancel = () => {
    stopped = true;

    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
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
