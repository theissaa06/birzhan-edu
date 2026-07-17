import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TurnstileBox from "../components/TurnstileBox";
import api from "../services/api";
import { clearAuthSession } from "../services/authStorage";
import "./LoginPage.css";

type ResetStep = "email" | "code" | "password";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devResetCode, setDevResetCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const normalizedEmail = email.trim().toLowerCase();

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");
      setDevResetCode("");

      const response = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
        turnstileToken: turnstileToken || undefined,
      });

      setMessage(
        response.data.message ||
          "Если этот email зарегистрирован, мы отправили код восстановления.",
      );

      if (response.data.resetCode) {
        setDevResetCode(response.data.resetCode);
      }

      setStep("code");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Не удалось отправить код восстановления. Попробуйте позже.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.post("/auth/verify-reset-code", {
        email: normalizedEmail,
        code: code.trim(),
      });

      setMessage(response.data.message || "Код подтверждён.");
      setStep("password");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Код недействителен или истёк. Запросите новый код.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8) {
      setError("Пароль должен быть минимум 8 символов.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/reset-password", {
        email: normalizedEmail,
        code: code.trim(),
        password,
      });

      clearAuthSession();

      setMessage(response.data.message || "Пароль обновлён.");
      setTimeout(() => navigate("/login"), 1400);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Не удалось сбросить пароль. Запросите новый код.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-wrap">
        <div className="auth-info">
          <p className="auth-kicker">Восстановление доступа</p>
          <h1>
            Вернём доступ к <span className="auth-brand">Frame School</span>
          </h1>
          <p className="auth-desc">
            Введите email, затем 6-значный код из письма и новый пароль.
          </p>
        </div>

        <div className="auth-card">
          <h2>Забыли пароль?</h2>
          <p className="auth-card-sub">
            Код действует 15 минут. После смены пароля старые сессии будут сброшены.
          </p>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          {devResetCode && (
            <div className="auth-security-warning">
              Dev-код восстановления: <strong>{devResetCode}</strong>
            </div>
          )}

          {step === "email" && (
            <form className="auth-form" onSubmit={handleEmailSubmit}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  autoComplete="email"
                  required
                />
              </label>

              <TurnstileBox onVerify={setTurnstileToken} />

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Отправляем..." : "Отправить код"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form className="auth-form" onSubmit={handleCodeSubmit}>
              <label className="auth-field">
                <span>Код из письма</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="482913"
                  autoComplete="one-time-code"
                  required
                />
              </label>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || code.length !== 6}
              >
                {loading ? "Проверяем..." : "Подтвердить код"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form className="auth-form" onSubmit={handlePasswordSubmit}>
              <label className="auth-field">
                <span>Новый пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="auth-field">
                <span>Повторите пароль</span>
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Обновляем..." : "Обновить пароль"}
              </button>
            </form>
          )}

          <p className="auth-footer-link">
            Вспомнили пароль? <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
