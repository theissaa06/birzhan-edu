import { useEffect } from "react";

const REVEAL_SELECTOR = [
  "main > section",
  "[data-frame-reveal]",
  ".card",
  "[class$='-card']",
  ".home-direction-card",
  ".home-benefit-card",
  ".home-learning-steps > div",
].join(",");

export default function FrameMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePointer = (event: PointerEvent) => {
      root.style.setProperty("--frame-pointer-x", `${event.clientX}px`);
      root.style.setProperty("--frame-pointer-y", `${event.clientY}px`);
    };

    root.dataset.frameMotionReady = "true";

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      document
        .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
        .forEach((element) => element.classList.add("is-frame-visible"));
      window.addEventListener("pointermove", updatePointer, { passive: true });

      return () => {
        delete root.dataset.frameMotionReady;
        window.removeEventListener("pointermove", updatePointer);
      };
    }

    const observed = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-frame-visible", entry.isIntersecting);
        });
      },
      {
        rootMargin: "-8% 0px -14% 0px",
        threshold: [0.08, 0.22, 0.48],
      }
    );

    const observe = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        if (observed.has(element)) return;
        observed.add(element);
        observer.observe(element);
      });
    };

    observe();
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      delete root.dataset.frameMotionReady;
      window.removeEventListener("pointermove", updatePointer);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
