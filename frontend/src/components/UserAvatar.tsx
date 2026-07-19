import { useEffect, useState } from "react";
import { avatarInitials, resolveAvatarUrl } from "../services/avatar";
import "./UserAvatar.css";

type UserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "small" | "medium" | "large" | "profile";
  className?: string;
  decorative?: boolean;
};

export default function UserAvatar({
  name,
  avatarUrl,
  size = "medium",
  className = "",
  decorative = false,
}: UserAvatarProps) {
  const url = resolveAvatarUrl(avatarUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const label = name ? `Аватар пользователя ${name}` : "Аватар пользователя";

  return (
    <span
      className={`user-avatar user-avatar--${size} ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {url && !failed ? (
        <img src={url} alt="" loading={size === "profile" ? "eager" : "lazy"} onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{avatarInitials(name)}</span>
      )}
    </span>
  );
}
