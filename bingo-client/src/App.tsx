import { useEffect, useState } from "react";
import "./App.css";

const GRID_SIZE = 3;
const MAX_NUMBER = 9;

function generateBingoCard(): number[][] {
  const numbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
  const shuffled = numbers.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, GRID_SIZE * GRID_SIZE);
  const grid: number[][] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    grid.push(selected.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE));
  }
  return grid;
}

export default function App() {
  const [card] = useState<number[][]>(generateBingoCard());
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ws = new WebSocket(
      "wss://kkblt3dovh.execute-api.ap-northeast-1.amazonaws.com/AkioHiratani?role=member"
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received:", data);

      if (data.type === "roundStart" && data.winIndex) {
        setChecked((prev) => new Set(prev).add(data.winIndex));
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="app">
      <h1 className="title">🎯 ビンゴカード</h1>
      <div className="card-grid" role="grid" aria-label="ビンゴカード">
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
