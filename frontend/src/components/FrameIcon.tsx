export type FrameIconName =
  | "all"
  | "cut"
  | "frame"
  | "lens"
  | "phone"
  | "sound"
  | "spark"
  | "timeline"
  | "premium"
  | "certificate"
  | "check"
  | "warning"
  | "webinar"
  | "folder"
  | "briefcase"
  | "time"
  | "lessons"
  | "support"
  | "send"
  | "close";

type FrameIconProps = {
  name: FrameIconName;
  className?: string;
  title?: string;
};

export default function FrameIcon({ name, className = "", title }: FrameIconProps) {
  return (
    <span
      className={`frame-icon frame-icon--${name} ${className}`.trim()}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    >
      <svg viewBox="0 0 32 32" focusable="false">
        {name === "all" && (
          <>
            <circle cx="16" cy="16" r="9" />
            <path d="M7 16h18M16 7c3 3.2 4.5 6.2 4.5 9S19 21.8 16 25M16 7c-3 3.2-4.5 6.2-4.5 9S13 21.8 16 25" />
          </>
        )}
        {name === "cut" && (
          <>
            <path d="M7 9l18 14M7 23L25 9" />
            <circle cx="8" cy="8" r="3" />
            <circle cx="8" cy="24" r="3" />
          </>
        )}
        {name === "frame" && (
          <>
            <path d="M7 12V7h5M20 7h5v5M25 20v5h-5M12 25H7v-5" />
            <path d="M10 16h12M16 10v12" />
          </>
        )}
        {name === "lens" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <circle cx="16" cy="16" r="5" />
            <path d="M16 6l4.8 8.2M25.4 16H16M20.8 23.8L16 16M11.2 23.8L16 16M6.6 16H16M11.2 8.2L16 16" />
          </>
        )}
        {name === "phone" && (
          <>
            <rect x="10" y="5" width="12" height="22" rx="3" />
            <path d="M14 8h4M15 24h2" />
          </>
        )}
        {name === "sound" && (
          <>
            <path d="M7 18h4l6 5V9l-6 5H7z" />
            <path d="M21 12c1.3 1.1 2 2.4 2 4s-.7 2.9-2 4M24 9c2.2 1.9 3.4 4.2 3.4 7S26.2 21.1 24 23" />
          </>
        )}
        {name === "spark" && (
          <>
            <path d="M16 5l2.8 7.2L26 15l-7.2 2.8L16 25l-2.8-7.2L6 15l7.2-2.8z" />
            <path d="M24 5v5M21.5 7.5h5" />
          </>
        )}
        {name === "timeline" && (
          <>
            <path d="M6 10h20M6 16h20M6 22h20" />
            <rect x="8" y="8" width="6" height="4" rx="1" />
            <rect x="16" y="14" width="8" height="4" rx="1" />
            <rect x="10" y="20" width="10" height="4" rx="1" />
          </>
        )}
        {name === "premium" && (
          <>
            <path d="M16 5l10 11-10 11L6 16z" />
            <path d="M11 16h10M16 10v12" />
          </>
        )}
        {name === "certificate" && (
          <>
            <rect x="6" y="7" width="20" height="16" rx="2" />
            <path d="M10 12h12M10 16h8M21 19l2 5 2-5" />
          </>
        )}
        {name === "check" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <path d="M10.5 16.5l3.5 3.5 7.5-8" />
          </>
        )}
        {name === "warning" && (
          <>
            <path d="M16 6l11 20H5z" />
            <path d="M16 13v5M16 23h.1" />
          </>
        )}
        {name === "webinar" && (
          <>
            <rect x="7" y="8" width="18" height="13" rx="2" />
            <path d="M12 25h8M16 21v4M12 13h8M12 17h5" />
          </>
        )}
        {name === "folder" && (
          <>
            <path d="M5 10h9l2 3h11v11H5z" />
            <path d="M5 13h22" />
          </>
        )}
        {name === "briefcase" && (
          <>
            <rect x="5" y="10" width="22" height="15" rx="2" />
            <path d="M12 10V7h8v3M5 16h22M15 16v3h2v-3" />
          </>
        )}
        {name === "time" && (
          <>
            <circle cx="16" cy="16" r="10" />
            <path d="M16 10v7l5 3" />
          </>
        )}
        {name === "lessons" && (
          <>
            <path d="M8 7h12a4 4 0 014 4v14H10a4 4 0 01-4-4V9a2 2 0 012-2z" />
            <path d="M11 12h8M11 16h10M11 20h6" />
          </>
        )}
        {name === "support" && (
          <>
            <path d="M7 17v-2a9 9 0 0118 0v2" />
            <path d="M7 17v6h4v-8H7M25 17v6h-4v-8h4M21 24c-1.2 2-3 3-5.5 3H14" />
          </>
        )}
        {name === "send" && (
          <>
            <path d="M5 7l22 9-22 9 4-9z" />
            <path d="M9 16h11" />
          </>
        )}
        {name === "close" && (
          <path d="M9 9l14 14M23 9L9 23" />
        )}
      </svg>
    </span>
  );
}
