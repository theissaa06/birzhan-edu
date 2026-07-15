import "./UserBadges.css";

export type UserBadgeValue = "PREMIUM" | "ADMIN" | "DEVELOPER" | "OWNER";

type UserBadgesProps = {
  role?: string | null;
  badges?: string[] | null;
  premiumUntil?: string | null;
  isPremium?: boolean;
  compact?: boolean;
  className?: string;
};

const badgeOrder: UserBadgeValue[] = ["OWNER", "DEVELOPER", "ADMIN", "PREMIUM"];

const badgeLabels: Record<UserBadgeValue, string> = {
  PREMIUM: "Premium",
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  OWNER: "Owner",
};

function isPremiumActive(premiumUntil?: string | null) {
  if (!premiumUntil) return false;
  const expiresAt = new Date(premiumUntil).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function BadgeIcon({ badge }: { badge: UserBadgeValue }) {
  return (
    <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
      {badge === "PREMIUM" && (
        <>
          <path d="M3 7.2 6.4 3h7.2L17 7.2 10 17z" />
          <path d="m3.4 7.3 6.6 3 6.6-3M6.5 3 10 10.3 13.5 3" />
        </>
      )}
      {badge === "ADMIN" && (
        <>
          <path d="M10 2.5 16 5v4.2c0 3.8-2.5 6.5-6 8.3-3.5-1.8-6-4.5-6-8.3V5z" />
          <path d="m7 9.7 2 2 4-4" />
        </>
      )}
      {badge === "DEVELOPER" && (
        <>
          <path d="m7.5 5-4 5 4 5M12.5 5l4 5-4 5M11.5 3.5l-3 13" />
        </>
      )}
      {badge === "OWNER" && (
        <>
          <path d="M3 7.5 6 11l4-7 4 7 3-3.5-1.2 8.5H4.2z" />
          <path d="M5 16h10" />
        </>
      )}
    </svg>
  );
}

export function resolveUserBadges({
  role,
  badges,
  premiumUntil,
  isPremium,
}: Omit<UserBadgesProps, "compact" | "className">) {
  const values = new Set<UserBadgeValue>();

  for (const rawBadge of badges || []) {
    const badge = String(rawBadge).toUpperCase() as UserBadgeValue;
    if (badgeOrder.includes(badge)) values.add(badge);
  }

  if (String(role || "").toUpperCase() === "ADMIN") values.add("ADMIN");
  if (isPremium || isPremiumActive(premiumUntil)) values.add("PREMIUM");

  return badgeOrder.filter((badge) => values.has(badge));
}

export default function UserBadges({
  compact = false,
  className = "",
  ...user
}: UserBadgesProps) {
  const badges = resolveUserBadges(user);
  if (badges.length === 0) return null;

  return (
    <span
      className={`user-badges ${compact ? "user-badges--compact" : ""} ${className}`.trim()}
      aria-label={`Значки пользователя: ${badges.map((badge) => badgeLabels[badge]).join(", ")}`}
    >
      {badges.map((badge) => (
        <span
          className={`user-badge user-badge--${badge.toLowerCase()}`}
          key={badge}
          title={badgeLabels[badge]}
        >
          <BadgeIcon badge={badge} />
          <span>{badgeLabels[badge]}</span>
        </span>
      ))}
    </span>
  );
}
