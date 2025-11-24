import { MAX_NUMBER } from "../domain/bingo";

export type SlotFrame = {
  /** 表示する図柄の番号 */
  symbol: number;
  /** 次の図柄に切り替わるまでの時間（ミリ秒） */
  durationMs: number;
};

export type SlotPlan = {
  /** UI が消化するフレーム列 */
  frames: SlotFrame[];
  /** 合計演出時間（ミリ秒） */
  totalDurationMs: number;
};

type SlotPlanOptions = {
  /** 回転に使用する図柄の候補 */
  symbolPool?: number[];
  /** 最低継続時間 */
  minDurationMs?: number;
  /** 最高継続時間 */
  maxDurationMs?: number;
};

const DEFAULT_MIN_DURATION_MS = 3000;
const DEFAULT_MAX_DURATION_MS = 7000;
const MIN_INTERVAL_MS = 70;
const MAX_INTERVAL_MS = 320;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * ソケットで受け取った winIndex に対するスロット演出計画を生成する。
 * UI 側は返却されたフレーム列を順次再生するだけで、緩急の付いた回転と確定図柄の停止を表現できる。
 */
export function createSlotPlan(
  targetSymbol: number,
  options: SlotPlanOptions = {}
): SlotPlan {
  const minDuration = options.minDurationMs ?? DEFAULT_MIN_DURATION_MS;
  const maxDuration = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const desiredDuration = Math.random() * (maxDuration - minDuration) + minDuration;

  // プレイ時間に応じてフレーム数を調整し、開始は高速・終了は低速になるように間隔を設計する。
  const frameCount = Math.max(12, Math.round(desiredDuration / 180));
  const rawDurations = Array.from({ length: frameCount }, (_, index) => {
    const progress = index / Math.max(frameCount - 1, 1);
    const eased = easeOutCubic(progress);
    return MIN_INTERVAL_MS + (MAX_INTERVAL_MS - MIN_INTERVAL_MS) * eased;
  });

  // 累積時間が指定範囲に収まるようにスケーリングする。
  const rawTotal = rawDurations.reduce((sum, value) => sum + value, 0);
  const scale = desiredDuration / rawTotal;
  const scaledDurations = rawDurations.map((value) => Math.round(value * scale));
  const totalDurationMs = scaledDurations.reduce((sum, value) => sum + value, 0);

  // 回転で使う図柄の候補を準備し、必ず確定図柄を含める。
  const availableSymbols = options.symbolPool?.length
    ? Array.from(new Set([...options.symbolPool, targetSymbol]))
    : Array.from({ length: MAX_NUMBER }, (_, index) => index + 1);

  const frames = scaledDurations.map((duration, index) => ({
    symbol:
      index === frameCount - 1
        ? targetSymbol
        : availableSymbols[Math.floor(Math.random() * availableSymbols.length)],
    durationMs: duration,
  }));

  return {
    frames,
    totalDurationMs,
  };
}
