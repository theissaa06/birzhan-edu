import { useEffect, useRef, useState } from "react";
import FrameIcon from "./FrameIcon";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        },
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

type TurnstileBoxProps = {
  onVerify: (token: string) => void;
};

const SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export default function TurnstileBox({ onVerify }: TurnstileBoxProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) onVerify("");
  }, [onVerify]);

  useEffect(() => {
    if (!SITE_KEY) return undefined;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        setLoadError(false);
        setReady(true);
      }
    };
    const markFailed = () => {
      if (!cancelled) {
        setLoadError(true);
        setReady(false);
        onVerify("");
      }
    };
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SRC}"]`,
    );

    if (existingScript) {
      if (window.turnstile) {
        markReady();
      } else {
        existingScript.addEventListener("load", markReady, { once: true });
        existingScript.addEventListener("error", markFailed, { once: true });
      }

      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", markReady);
        existingScript.removeEventListener("error", markFailed);
      };
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", markReady, { once: true });
    script.addEventListener("error", markFailed, { once: true });
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", markReady);
      script.removeEventListener("error", markFailed);
    };
  }, [onVerify]);

  useEffect(() => {
    if (!SITE_KEY || !ready || !boxRef.current || !window.turnstile) {
      return undefined;
    }
    if (widgetIdRef.current) return undefined;

    try {
      widgetIdRef.current = window.turnstile.render(boxRef.current, {
        sitekey: SITE_KEY,
        theme: "dark",
        size: "normal",
        callback: (token: string) => {
          setLoadError(false);
          onVerify(token);
        },
        "expired-callback": () => onVerify(""),
        "error-callback": () => {
          setLoadError(true);
          onVerify("");
        },
      });
    } catch (error) {
      console.error("[Turnstile] Widget render failed.", error);
      setLoadError(true);
      onVerify("");
    }

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.warn("[Turnstile] Widget cleanup failed.", error);
        }
      }
      widgetIdRef.current = null;
    };
  }, [ready, onVerify]);

  if (!SITE_KEY) {
    return (
      <div className="auth-security-status" role="status">
        <FrameIcon name="check" />
        <span>
          <strong>Вход защищён</strong>
          <small>Частые попытки блокируются на сервере.</small>
        </span>
      </div>
    );
  }

  return (
    <div className="auth-security-box">
      <span>Проверка безопасности</span>
      <div className="auth-turnstile" ref={boxRef} />
      {loadError && (
        <small className="auth-security-error" role="alert">
          Проверка не загрузилась. Разрешите challenges.cloudflare.com и
          обновите страницу.
        </small>
      )}
    </div>
  );
}
