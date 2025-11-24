import { MAX_NUMBER, type SocketMessage } from "../domain/bingo";

export type SlotFrame = {
  /**
   * Symbol number to render for this frame. The domain uses numerical IDs that match the symbol assets.
   */
  symbolIndex: number;
  /**
   * Duration in milliseconds to wait before moving to the next frame. This value is eased to create pacing.
   */
  delayMs: number;
};

export type SlotSpinPlan = {
  /**
   * Ordered frames that represent the spin. The last entry is always the target symbol the server requested.
   */
  frames: SlotFrame[];
  /**
   * The number that should be shown at rest after the sequence completes.
   */
  targetSymbol: number;
  /**
   * Aggregate length of the spin animation in milliseconds. This is used for telemetry or timing guards.
   */
  totalDurationMs: number;
};

/**
 * Ease-out helper used to slow the interval toward the end of the spin.
 * Using a cubic curve keeps the early portion energetic while making the stop feel natural.
 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

/**
 * Provides a random integer between min and max (inclusive) to vary total spin length per request.
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks a symbol index that is different from the provided exclusion. This keeps the spin visually dynamic.
 */
function pickRandomSymbol(symbolCount: number, exclude: number): number {
  const candidate = randomInRange(1, symbolCount);
  if (candidate === exclude) {
    return ((candidate % symbolCount) + 1);
  }
  return candidate;
}

/**
 * Calculates a slot spin plan that lasts between 3-7 seconds and finishes on the requested symbol.
 * The plan is consumed by the presentation layer to render a paced sequence without embedding timing logic there.
 */
export function createSlotSpinPlan(targetSymbol: number, symbolCount = MAX_NUMBER): SlotSpinPlan {
  const totalDuration = randomInRange(3000, 3000);
  const estimatedSteps = Math.max(20, Math.floor(totalDuration / 120));
  const minDelay = 45;
  const maxDelay = 260;
  const frames: SlotFrame[] = [];

  for (let step = 0; step < estimatedSteps; step += 1) {
    const isFinalStep = step === estimatedSteps - 1;
    const progress = step / Math.max(estimatedSteps - 1, 1);
    const easedDelay = Math.round(minDelay + (maxDelay - minDelay) * easeOutCubic(progress));
    const symbolIndex = isFinalStep
      ? targetSymbol
      : pickRandomSymbol(symbolCount, targetSymbol);

    frames.push({ symbolIndex, delayMs: easedDelay });
  }

  const totalDurationMs = frames.reduce((sum, frame) => sum + frame.delayMs, 0);

  return { frames, targetSymbol, totalDurationMs };
}

/**
 * Detects a usable winIndex value from the socket payload and prepares the corresponding spin plan.
 * Returning null lets the caller know the message can skip the slot presentation.
 */
export function createSlotPlanFromMessage(
  message: SocketMessage,
  symbolCount = MAX_NUMBER
): SlotSpinPlan | null {
  if (message.type !== "roundStart") {
    return null;
  }

  const unsafeWinIndex = (message as Record<string, unknown>).winIndex;
  if (typeof unsafeWinIndex !== "number") {
    return null;
  }

  return createSlotSpinPlan(unsafeWinIndex, symbolCount);
}
