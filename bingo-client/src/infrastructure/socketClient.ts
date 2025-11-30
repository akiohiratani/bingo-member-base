import type { SocketMessage } from "../domain/bingo";

export type SocketControls = {
  start: () => void;
  stop: () => void;
};

export function createBingoSocket(
  url: string,
  onMessage: (message: SocketMessage) => void,
  onError?: (message: string) => void
): SocketControls {
  let socket: WebSocket | null = null;
  let manuallyStopped = false;

  const notifyError = (message: string) => {
    onError?.(message);
  };

  const start = () => {
    if (socket) {
      return;
    }

    manuallyStopped = false;
    socket = new WebSocket(url);

    socket.onmessage = (event) => {
      const parsed: SocketMessage = JSON.parse(event.data);
      onMessage(parsed);
    };

    socket.onerror = () => {
      notifyError("サーバーへの接続に失敗しました。再接続をお試しください。");
    };

    socket.onclose = (event) => {
      const wasManual = manuallyStopped;
      socket = null;
      manuallyStopped = false;

      if (wasManual) {
        return;
      }

      const reason =
        event.reason ||
        (event.wasClean
          ? "接続が終了しました。"
          : "接続が切断されました。インターネット接続を確認してください。");
      const codeInfo = event.code ? ` (コード: ${event.code})` : "";
      notifyError(`${reason}${codeInfo}`);
    };
  };

  const stop = () => {
    if (!socket) {
      return;
    }

    manuallyStopped = true;
    socket.close();
    socket = null;
  };

  return { start, stop };
}
