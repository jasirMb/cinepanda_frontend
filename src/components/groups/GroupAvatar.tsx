"use client";

import { Users } from "lucide-react";

/** Round group badge — shows the uploaded image, else a coloured icon. */
export function GroupAvatar({
  name,
  color,
  avatarUrl,
  size = 40,
  iconClassName = "h-5 w-5",
}: {
  name?: string;
  color?: string;
  avatarUrl?: string;
  size?: number;
  iconClassName?: string;
}) {
  const bg = color || "#3076A1";
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white"
      style={{ width: size, height: size, backgroundColor: avatarUrl ? undefined : bg }}
      title={name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name ?? "Group"}
          className="h-full w-full object-cover"
        />
      ) : (
        <Users className={iconClassName} />
      )}
    </span>
  );
}
