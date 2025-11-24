import type { SocketMessage } from "../domain/bingo";

export type SocketControls = {
  start: () => void;
  stop: () => void;
};

export function createBingoSocket(
  url: string,
  onMessage: (message: SocketMessage) => void
): SocketControls {
  let socket: WebSocket | null = null;

  const start = () => {
    if (socket) {
      return;
    }

    socket = new WebSocket(url);

    socket.onmessage = (event) => {
      const parsed: SocketMessage = JSON.parse(event.data);
      onMessage(parsed);
    };

    socket.onclose = () => {
      socket = null;
    };
  };

  const stop = () => {
    socket?.close();
    socket = null;
  };

  return { start, stop };
}
