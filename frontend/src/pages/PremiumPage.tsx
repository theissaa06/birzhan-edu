import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./PremiumPage.css";

type PremiumStatus = {
  isPremium: boolean;
  plan: string | null;
  startedAt: string | null;
  expiresAt: string | null;
};

declare global {
  interface Window {
    cp?: any;
  }
}

const USER_ID = 1;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003/api";

const PAYMENT_REGION = import.meta.env.VITE_PAYMENT_REGION || "KZ";

const KZ_PUBLIC_ID = import.meta.env.VITE_TIPTOPPAY_KZ_PUBLIC_ID;
const RU_PUBLIC_ID = import.meta.env.VITE_CLOUDPAYMENTS_RU_PUBLIC_ID;

const PAYMENT_PUBLIC_ID = PAYMENT_REGION === "RU" ? RU_PUBLIC_ID : KZ_PUBLIC_ID;

const PAYMENT_CURRENCY = PAYMENT_REGION === "RU" ? "RUB" : "KZT";
const PAYMENT_AMOUNT = PAYMENT_REGION === "RU" ? 990 : 4990;

const PAYMENT_WIDGET_SRC =
  PAYMENT_REGION === "RU"
    ? "https://widget.cloudpayments.ru/bundles/cloudpayments.js"
    : "https://widget.tiptoppay.kz/bundles/widget.js";

export default function PremiumPage() {
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isPremiumActive = Boolean(premium?.isPremium);

  const paymentDescription = useMemo(() => {
    return `Premium PRO Pack — Birzhan-Edu Platform (${PAYMENT_REGION})`;
  }, []);

  async function loadPremiumStatus() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/premium/status?userId=${USER_ID}`,
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Не удалось получить Premium-статус");
      }

      setPremium(data.data);
    } catch (err) {
      console.error("Ошибка Premium status:", err);
      setError("Не удалось загрузить Premium-статус. Проверь backend.");
    } finally {
      setLoading(false);
    }
  }

  async function activatePremiumAfterPayment(transactionId?: string) {
    const response = await fetch(`${API_URL}/premium/activate-test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: USER_ID,
        transactionId,
        provider: PAYMENT_REGION === "RU" ? "cloudpayments_ru" : "tiptoppay_kz",
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Не удалось активировать Premium");
    }

    setPremium(data.data);
    setSuccessMessage("Premium PRO успешно оплачен и активирован!");
  }

  async function handleCancelPremium() {
    try {
      setPaying(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(`${API_URL}/premium/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: USER_ID,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Не удалось отключить Premium");
      }

      setPremium(data.data);
      setSuccessMessage("Premium отключён.");
    } catch (err) {
      console.error("Ошибка отключения Premium:", err);
      setError("Не удалось отключить Premium.");
    } finally {
      setPaying(false);
    }
  }

  function openPaymentWidget() {
    setError("");
    setSuccessMessage("");

    if (!PAYMENT_PUBLIC_ID) {
      setError(
        "Public ID ещё не добавлен. Когда TipTop Pay даст Public ID, вставь его в frontend/.env.",
      );
      return;
    }

    if (!window.cp?.CloudPayments) {
      setError("Платёжный виджет ещё не загрузился. Обнови страницу.");
      return;
    }

    setPaying(true);

    const widget = new window.cp.CloudPayments();

    widget.pay(
      "charge",
      {
        publicId: PAYMENT_PUBLIC_ID,
        description: paymentDescription,
        amount: PAYMENT_AMOUNT,
        currency: PAYMENT_CURRENCY,
        accountId: `user-${USER_ID}`,
        invoiceId: `premium-${USER_ID}-${Date.now()}`,
        skin: "modern",
        data: {
          userId: USER_ID,
          plan: "Premium PRO Pack",
          project: "birzhan-edu",
          region: PAYMENT_REGION,
        },
      },
      {
        onSuccess: async (options: any) => {
          try {
            const transactionId =
              options?.transactionId ||
              options?.TransactionId ||
              options?.invoiceId ||
              options?.InvoiceId;

            await activatePremiumAfterPayment(String(transactionId || ""));
          } catch (err) {
            console.error("Ошибка после оплаты:", err);
            setError(
              "Оплата прошла, но Premium не активировался. Проверь backend.",
            );
          } finally {
            setPaying(false);
          }
        },

        onFail: (reason: any) => {
          console.error("Оплата не прошла:", reason);
          setError("Оплата не прошла или была отменена.");
          setPaying(false);
        },

        onComplete: () => {
          setPaying(false);
        },
      },
    );
  }

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  useEffect(() => {
    const existingScript = document.querySelector(
      `script[src="${PAYMENT_WIDGET_SRC}"]`,
    );

    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = PAYMENT_WIDGET_SRC;
    script.async = true;

    script.onload = () => {
      setScriptLoaded(true);
    };

    script.onerror = () => {
      setError("Не удалось загрузить платёжный виджет.");
    };

    document.body.appendChild(script);
  }, []);

  return (
    <main className="premium-page">
      <section className="premium-hero">
        <Link to="/courses" className="premium-back">
          ← Назад к курсам
        </Link>

        <span className="premium-badge">Premium PRO</span>

        <h1>Ускорь рост в монтаже с Premium PRO</h1>

        <p>
          Основные курсы Birzhan-Edu доступны бесплатно. Premium PRO — это
          профессиональный пакет для тех, кто хочет быстрее расти: вебинары,
          разбор работ, бонусные материалы, портфолио, карьерные чек-листы и
          расширенные сертификаты.
        </p>
      </section>

      {successMessage && (
        <div className="premium-toast premium-toast--success">
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div className="premium-toast premium-toast--error">⚠️ {error}</div>
      )}

      <section className="premium-layout">
        <article className="premium-plan-card">
          <div className="premium-plan-head">
            <span>Premium PRO Pack</span>
            <h2>
              {PAYMENT_AMOUNT.toLocaleString("ru-RU")} {PAYMENT_CURRENCY}
            </h2>
            <p>за 1 месяц PRO-возможностей</p>
          </div>

          <div className="premium-features">
            <p>✅ Закрытые вебинары и записи занятий</p>
            <p>✅ Проверка практических заданий</p>
            <p>✅ Разбор работ и рекомендации по улучшению</p>
            <p>✅ Бонусы: LUT, пресеты, чек-листы, AI-паки</p>
            <p>✅ Портфолио-шаблоны и карьерные материалы</p>
            <p>✅ Premium-сертификат с QR-проверкой</p>
          </div>

          {loading ? (
            <button className="premium-pay-btn" disabled>
              Загружаем статус...
            </button>
          ) : isPremiumActive ? (
            <div className="premium-active-box">
              <h3>🎉 Premium PRO активен</h3>

              <p>
                План: <strong>{premium?.plan}</strong>
              </p>

              <p>
                Действует до:{" "}
                <strong>
                  {premium?.expiresAt
                    ? new Date(premium.expiresAt).toLocaleDateString("ru-RU")
                    : "не указано"}
                </strong>
              </p>

              <button
                type="button"
                onClick={handleCancelPremium}
                disabled={paying}
              >
                {paying ? "Отключаем..." : "Отключить Premium"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="premium-pay-btn"
              onClick={openPaymentWidget}
              disabled={paying || !scriptLoaded}
            >
              {paying
                ? "Ожидаем оплату..."
                : !scriptLoaded
                  ? "Загружаем оплату..."
                  : "💳 Оформить Premium PRO"}
            </button>
          )}
        </article>

        <section className="premium-preview">
          <div className="premium-preview-card">
            <span>Статус аккаунта</span>

            <h2>{isPremiumActive ? "Premium PRO активен" : "Free аккаунт"}</h2>

            <div className="premium-progress">
              <div style={{ width: isPremiumActive ? "100%" : "35%" }}></div>
            </div>

            <p>
              {isPremiumActive
                ? "PRO-возможности открыты: вебинары, бонусы, проверка работ, портфолио-материалы и расширенные сертификаты."
                : "Базовое обучение уже доступно бесплатно. Premium PRO откроет дополнительные материалы для быстрого роста."}
            </p>
          </div>

          <div className="premium-benefit-grid">
            <article>
              <strong>🎙️</strong>
              <h3>Вебинары</h3>
              <p>Закрытые эфиры, записи занятий и разборы популярных ошибок.</p>
            </article>

            <article>
              <strong>🎁</strong>
              <h3>PRO-бонусы</h3>
              <p>LUT, пресеты, AI-паки, чек-листы и материалы для монтажа.</p>
            </article>

            <article>
              <strong>🧑‍🏫</strong>
              <h3>Проверка работ</h3>
              <p>
                Обратная связь по практическим заданиям и улучшению монтажа.
              </p>
            </article>

            <article>
              <strong>🎓</strong>
              <h3>Premium-сертификат</h3>
              <p>Расширенный сертификат с QR-проверкой и ID документа.</p>
            </article>
          </div>
        </section>
      </section>

      <section className="premium-unlock-section">
        <div className="premium-section-head">
          <span className="premium-section-badge">После оплаты</span>
          <h2>Что откроется сразу после активации Premium PRO</h2>
          <p>
            Курсы остаются доступными бесплатно, а Premium PRO добавляет
            профессиональные инструменты для практики, портфолио и карьерного
            роста.
          </p>
        </div>

        <div className="premium-unlock-grid">
          <article className="premium-unlock-card">
            <div className="premium-unlock-icon">🎙️</div>
            <h3>Закрытые вебинары</h3>
            <p>
              Доступ к вебинарам, записям занятий, разбору ошибок и практическим
              сессиям по монтажу.
            </p>
          </article>

          <article className="premium-unlock-card">
            <div className="premium-unlock-icon">🎁</div>
            <h3>Бонусные материалы</h3>
            <p>
              LUT-паки, пресеты, чек-листы, AI-паки, шаблоны и дополнительные
              файлы для монтажа.
            </p>
          </article>

          <article className="premium-unlock-card">
            <div className="premium-unlock-icon">🧑‍🏫</div>
            <h3>Проверка практики</h3>
            <p>
              Возможность отправлять работы на проверку и получать рекомендации
              по улучшению результата.
            </p>
          </article>

          <article className="premium-unlock-card">
            <div className="premium-unlock-icon">📁</div>
            <h3>Портфолио-пак</h3>
            <p>
              Шаблоны оформления портфолио, идеи для первых работ и структура
              презентации навыков.
            </p>
          </article>

          <article className="premium-unlock-card">
            <div className="premium-unlock-icon">💼</div>
            <h3>Карьерные чек-листы</h3>
            <p>
              Материалы по первым заказам, поиску клиентов, оформлению услуг и
              старту во фрилансе.
            </p>
          </article>

          <article className="premium-unlock-card">
            <div className="premium-unlock-icon">🎓</div>
            <h3>Premium-сертификат</h3>
            <p>
              Расширенный сертификат с QR-кодом, ID документа и красивым
              premium-дизайном.
            </p>
          </article>
        </div>
      </section>

      <section className="premium-audience-section">
        <div className="premium-section-head">
          <span className="premium-section-badge">Кому подходит</span>
          <h2>Premium PRO нужен тем, кто хочет быстрее выйти на результат</h2>
          <p>
            Подписка подходит тем, кто уже проходит бесплатные курсы и хочет
            получить больше практики, обратной связи, материалов и карьерного
            направления.
          </p>
        </div>

        <div className="premium-audience-grid">
          <article>
            <div>🎬</div>
            <h3>Новичкам в монтаже</h3>
            <p>Чтобы не просто смотреть уроки, а получать помощь и практику.</p>
          </article>

          <article>
            <div>📱</div>
            <h3>Блогерам</h3>
            <p>
              Чтобы быстрее делать ролики для TikTok, Reels, Shorts и YouTube.
            </p>
          </article>

          <article>
            <div>💼</div>
            <h3>Будущим фрилансерам</h3>
            <p>Чтобы собрать портфолио и увереннее выйти на первые заказы.</p>
          </article>

          <article>
            <div>⚡</div>
            <h3>Тем, кто хочет PRO-рост</h3>
            <p>
              Для тех, кто хочет разборы работ, бонусы, вебинары и карьерные
              материалы.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
