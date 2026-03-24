"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { ThemePreference } from "@/lib/humor-flavor-types";

interface TopbarProps {
  title: string;
  subtitle: string;
  userName: string | null;
  userEmail: string | null;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onSignOut: () => void;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}

export default function AdminTopbar({
  title,
  subtitle,
  userName,
  userEmail,
  theme,
  onThemeChange,
  onSignOut,
  backHref,
  backLabel,
  action,
}: TopbarProps) {
  function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.assign("/");
  }

  return (
    <aside className="admin-sidebar section-enter xl:sticky xl:top-6 xl:self-start">
      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Link href="/" onClick={handleHomeClick} className="sidebar-home-link sidebar-kicker">
              Prompt Lab
            </Link>
            {backHref && backLabel ? (
              <Link href={backHref} className="sidebar-backlink-btn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {backLabel}
              </Link>
            ) : null}
          </div>

          <div className="space-y-2">
            <h1 className="sidebar-title">{title}</h1>
            <p className="sidebar-copy">{subtitle}</p>
          </div>
        </div>

        {action ? <div className="sidebar-action-slot">{action}</div> : null}

        <div className="sidebar-divider" />

        <section className="sidebar-section">
          <p className="sidebar-label">Appearance</p>
          <div className="sidebar-option-list" role="group" aria-label="Theme">
            {(["light", "dark", "system"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={theme === option}
                onClick={() => onThemeChange(option)}
                className="sidebar-option"
              >
                <span>
                  {option === "system"
                    ? "System"
                    : option === "light"
                      ? "Light"
                      : "Dark"}
                </span>
                {theme === option ? <span>Active</span> : null}
              </button>
            ))}
          </div>
        </section>

        <div className="sidebar-divider" />

        <section className="sidebar-section">
          {(userName || userEmail) ? (
            <div className="space-y-1">
              {userName ? (
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {userName}
                </p>
              ) : null}
              {userEmail ? (
                <p title={userEmail} className="sidebar-meta truncate">
                  {userEmail}
                </p>
              ) : null}
            </div>
          ) : null}

          <button onClick={onSignOut} className="sidebar-signout">
            Sign out
          </button>
        </section>
      </div>
    </aside>
  );
}
