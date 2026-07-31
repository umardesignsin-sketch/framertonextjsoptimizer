"use client";

import { useState } from "react";

function initials(email: string): string {
  const name = email.split("@")[0] || "";
  return (name.slice(0, 2) || "??").toUpperCase();
}

/** Gravatar image with an initials fallback if the request ever fails. */
export function Avatar({
  email,
  avatarUrl,
  className = "avatar",
  title,
}: {
  email: string;
  avatarUrl: string;
  className?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={className} title={title}>
        {initials(email)}
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt=""
      title={title}
      className={className}
      style={{ objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
