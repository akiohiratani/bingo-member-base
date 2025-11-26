import { type FormEvent, useState } from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import { userPool } from "../domain/cognitoConfig";
import "../App.css";

type WelcomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export default function WelcomeModal({ isOpen, onClose, onConnected }: WelcomeModalProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleLogin = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    setError(null);
    setIsLoading(true);

    const authenticationDetails = new AuthenticationDetails({
      Username: userId,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: userId,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result: CognitoUserSession) => {
        const idToken = result.getIdToken().getJwtToken();
        localStorage.setItem("idToken", idToken);

        setIsLoading(false);
        onClose();
        onConnected();
      },
      onFailure: () => {
        setIsLoading(false);
        setError("ID またはパスワードが正しくありません。");
      },
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 className="modal-title">Welcome!</h2>
        <p className="modal-body">
          準備が完了しましたら、ID とパスワードを入力してログインしてください。
        </p>
        <p className="modal-body">
          ※ゲーム中は、電源を切ったり画面を切り替えたりしないでください。
        </p>
        {error ? (
          <p className="modal-body" style={{ color: "#d64545" }} role="alert">
            {error}
          </p>
        ) : null}
        <form className="modal-form" onSubmit={handleLogin}>
          <label className="modal-label" htmlFor="userId">
            ユーザーID
          </label>
          <input
            id="userId"
            type="text"
            className="modal-input"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={isLoading}
            required
          />
          <label className="modal-label" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            className="modal-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            required
          />
          <div className="modal-actions">
            <button
              className="modal-button"
              type="submit"
              disabled={isLoading || userId === "" || password === ""}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
