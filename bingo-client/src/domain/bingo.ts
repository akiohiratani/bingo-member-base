export type BingoCard = number[][];

export type SocketMessage =
  | {
      type: "roundStart";
      winIndex?: number;
      winIndices?: number[];
    }
  | Record<string, unknown>;

export const GRID_SIZE = 3;
export const MAX_NUMBER = 18;

export function generateBingoCard(): BingoCard {
  const numbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
  const shuffled = [...numbers].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, GRID_SIZE * GRID_SIZE);
  const grid: BingoCard = [];

  for (let i = 0; i < GRID_SIZE; i += 1) {
    grid.push(selected.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE));
  }

  return grid;
}

export function extractOpenableNumbers(
  message: SocketMessage,
  card: BingoCard
): number[] {
  if (message.type !== "roundStart") {
    return [];
  }

  const messageWithOptionalArrays = message as {
    winIndex?: unknown;
    winIndices?: unknown;
  };

  const indices: number[] = Array.isArray(messageWithOptionalArrays.winIndices)
    ? (messageWithOptionalArrays.winIndices as number[])
    : typeof messageWithOptionalArrays.winIndex === "number"
      ? [messageWithOptionalArrays.winIndex as number]
      : [];

  const cardNumbers = new Set(card.flat());

  return indices.filter((index) => cardNumbers.has(index));
}
