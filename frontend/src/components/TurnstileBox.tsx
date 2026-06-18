import { useEffect, useRef, useState } from "react";

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

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export default function TurnstileBox({ onVerify }: TurnstileBoxProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // Если нет ключа — сразу передаём bypass-токен, форма работает без капчи
  useEffect(() => {
    if (!SITE_KEY) {
      onVerify("bypass-no-key");
    }
  }, [onVerify]);

  useEffect(() => {
    if (!SITE_KEY) return;

    const existingScript = document.querySelector(
      `script[src="${TURNSTILE_SRC}"]`,
    );

    if (existingScript) {
      if (window.turnstile) {
        setReady(true);
      } else {
        existingScript.addEventListener("load", () => setReady(true), {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!SITE_KEY || !ready || !boxRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(boxRef.current, {
      sitekey: SITE_KEY,
      theme: "dark",
      size: "normal",
      callback: (token: string) => onVerify(token),
      "expired-callback": () => onVerify(""),
      "error-callback": () => onVerify(""),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready, onVerify]);

  // Нет ключа — не показываем ничего, форма работает без капчи
  if (!SITE_KEY) {
    return null;
  }

  return (
    <div className="auth-security-box">
      <span>Проверка безопасности</span>
      <div className="auth-turnstile" ref={boxRef} />
    </div>
  );
}
