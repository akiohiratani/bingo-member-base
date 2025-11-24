import type { BingoCard, SocketMessage } from "../domain/bingo";
import { progressBingo, type BingoState, type BingoProgressResult } from "./bingoProgress";
import { createSlotPlan, type SlotPlan } from "./slotPlan";

type PreparedRound = {
  /** スロット演出を再生するための計画。表示不要な場合は null。 */
  slotPlan: SlotPlan | null;
  /** スロット終了後に適用すべきビンゴ進行結果。 */
  progress: BingoProgressResult;
};

function extractPrimaryWinIndex(message: SocketMessage): number | null {
  if (message.type !== "roundStart") {
    return null;
  }

  const candidate = (message as { winIndex?: unknown }).winIndex;
  if (typeof candidate === "number") {
    return candidate;
  }

  const fallbacks = (message as { winIndices?: unknown }).winIndices;
  if (Array.isArray(fallbacks) && typeof fallbacks[0] === "number") {
    return fallbacks[0];
  }

  return null;
}

/**
 * ラウンド開始メッセージを UI で扱いやすい仕事単位に分解する。
 * ビンゴ更新計算とスロット演出の計画をまとめて返すため、プレゼンテーション層の責務を最小限にする。
 */
export function prepareRound(
  message: SocketMessage,
  card: BingoCard,
  prevState: BingoState
): PreparedRound | null {
  const progress = progressBingo(message, card, prevState);

  if (!progress) {
    return null;
  }

  const winIndex = extractPrimaryWinIndex(message);
  const slotPlan = typeof winIndex === "number" ? createSlotPlan(winIndex, { symbolPool: card.flat() }) : null;

  return {
    slotPlan,
    progress,
  };
}
