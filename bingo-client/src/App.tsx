import { useEffect, useState } from "react";

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
  const [card, setCard] = useState<number[][]>(generateBingoCard());
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ws = new WebSocket(
      "wss://kkblt3dovh.execute-api.ap-northeast-1.amazonaws.com/AkioHiratani?role=member"
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received:", data);

      if (data.type === "roundStart" && data.winIndex) {
        // winIndexをカード上の数字としてチェック
        setChecked((prev) => new Set(prev).add(data.winIndex));
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>🎯 ビンゴカード</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 80px)`,
          gap: "8px",
          justifyContent: "center",
        }}
      >
        {card.flat().map((num) => (
          <div
            key={num}
            style={{
              width: "80px",
              height: "80px",
              lineHeight: "80px",
              border: "2px solid #333",
              borderRadius: "10px",
              backgroundColor: checked.has(num) ? "#4CAF50" : "#fff",
              color: checked.has(num) ? "#fff" : "#000",
              fontWeight: "bold",
              fontSize: "24px",
            }}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
}
