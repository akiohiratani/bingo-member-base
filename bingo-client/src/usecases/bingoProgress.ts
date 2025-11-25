import { extractOpenableNumbers, GRID_SIZE, type BingoCard, type SocketMessage } from "../domain/bingo";

export type BingoStatus = "none" | "reach" | "bingo";
export type FlashType = "reach" | "bingo";

export type BingoState = {
  checked: Set<number>;
  status: BingoStatus;
};

export type BingoProgressResult = {
  nextState: BingoState;
  effects: {
    triggerAnimation: boolean;
    playChirp: boolean;
    flash: FlashType | null;
    playWinSound: boolean;
  };
};

function collectLines(card: BingoCard): number[][] {
  const lines: number[][] = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    lines.push(card[row]);
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const column: number[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      column.push(card[row][col]);
    }
    lines.push(column);
  }

  const leadingDiagonal: number[] = [];
  const counterDiagonal: number[] = [];
  for (let index = 0; index < GRID_SIZE; index += 1) {
    leadingDiagonal.push(card[index][index]);
    counterDiagonal.push(card[index][GRID_SIZE - index - 1]);
  }
  lines.push(leadingDiagonal, counterDiagonal);

  return lines;
}

export function findReachTargets(card: BingoCard, checked: Set<number>): Set<number> {
  const lines = collectLines(card);
  const targets = new Set<number>();

  for (const line of lines) {
    const missing = line.filter((value) => !checked.has(value));

    if (missing.length === 1) {
      targets.add(missing[0]);
    }
  }

  return targets;
}

function evaluateBingoStatus(card: BingoCard, checked: Set<number>): BingoStatus {
  const lines = collectLines(card);
  let hasReach = false;

  for (const line of lines) {
    const checkedCount = line.filter((value) => checked.has(value)).length;

    if (checkedCount === line.length) {
      return "bingo";
    }

    if (checkedCount === line.length - 1) {
      hasReach = true;
    }
  }

  return hasReach ? "reach" : "none";
}

export function progressBingo(
  message: SocketMessage,
  card: BingoCard,
  prevState: BingoState
): BingoProgressResult | null {
  const openableNumbers = extractOpenableNumbers(message, card);

  if (openableNumbers.length === 0) {
    return null;
  }

  const nextChecked = new Set(prevState.checked);
  openableNumbers.forEach((num) => nextChecked.add(num));

  const nextStatus = evaluateBingoStatus(card, nextChecked);
  const transitionedToBingo = nextStatus === "bingo" && prevState.status !== "bingo";
  const transitionedToReach =
    nextStatus === "reach" && prevState.status !== "reach" && prevState.status !== "bingo";

  return {
    nextState: { checked: nextChecked, status: nextStatus },
    effects: {
      triggerAnimation: true,
      playChirp: true,
      flash: transitionedToBingo ? "bingo" : transitionedToReach ? "reach" : null,
      playWinSound: transitionedToBingo,
    },
  };
}
