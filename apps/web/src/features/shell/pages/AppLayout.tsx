import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LensMark } from "../../../components/ui/LensMark";
import { useAuth } from "../../auth/hooks";
import { useMatches } from "../../matches/hooks";
import { NotificationFeed } from "../../notifications/components/NotificationFeed";
import { useUnreadCount } from "../../notifications/hooks";

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;

const NAV_ITEMS: Array<{
  label: string;
  to: string;
  icon: ReactNode;
  badge?: boolean;
}> = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Workspace",
    to: "/startups",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M3 21V9l9-6 9 6v12" />
      </svg>
    ),
  },
  {
    label: "Matches",
    to: "/matches",
    badge: true,
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    label: "Resume Studio",
    to: "/resume-studio",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M14 3v5h5M6 3h8l5 5v13H6z" />
      </svg>
    ),
  },
  {
    label: "Pipeline",
    to: "/crm",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M3 3v18h18M7 15l4-5 3 3 5-7" />
      </svg>
    ),
  },
  {
    label: "Assistant",
    to: "/assistant",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M21 11a8 8 0 1 1-3.5-6.6M21 4v6h-6" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    to: "/notifications",
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
];

const NAV_ITEM_CLASSES =
  "mb-0.5 flex items-center gap-[11px] rounded-[9px] px-3 py-2 text-[12.5px] font-medium text-[#9AA6B2] hover:bg-white/5 hover:text-white [&>svg]:h-[17px] [&>svg]:w-[17px] [&>svg]:shrink-0 [&.active]:bg-[rgba(24,160,88,0.16)] [&.active]:text-white [&.active>svg]:stroke-emerald";

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "?").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function AppLayout() {
  const { user, isLoading, logout } = useAuth();
  const unreadQuery = useUnreadCount();
  const matchesQuery = useMatches();
  const navigate = useNavigate();
  const [feedOpen, setFeedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedOpen && !menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (feedRef.current && !feedRef.current.contains(e.target as Node))
        setFeedOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [feedOpen, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (isLoading) {
    return <div className="p-8 text-sm text-muted">Loading…</div>;
  }

  const unread = unreadQuery.data?.count ?? 0;
  const matchCount = matchesQuery.data?.data.length ?? 0;
  const displayName = user?.full_name?.trim() || user?.email || "";

  return (
    <div className="flex min-h-screen bg-paper">
      {/* ---- Sidebar: near-black, 240px → 76px icon rail below 900px ---- */}
      <aside className="sticky top-0 flex h-screen w-[76px] shrink-0 flex-col bg-near-black px-3.5 py-5 min-[900px]:w-60 max-[640px]:hidden">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
          <LensMark size={24} />
          <span className="font-serif text-[16px] font-semibold text-white min-[900px]:block max-[900px]:hidden">
            Scout
          </span>
        </Link>

        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to} className={NAV_ITEM_CLASSES}>
              {item.icon}
              <span className="min-[900px]:block max-[900px]:hidden">
                {item.label}
              </span>
              {item.badge && matchCount > 0 ? (
                <span className="ml-auto rounded-pill bg-emerald px-1.5 py-0.5 text-[10px] font-bold text-white min-[900px]:block max-[900px]:hidden">
                  {matchCount > 9 ? "9+" : matchCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <p className="px-3 pb-1.5 pt-4 text-[10px] font-medium uppercase tracking-wide text-[#4F5A68] min-[900px]:block max-[900px]:hidden">
          Account
        </p>
        <Link to="/settings" className={NAV_ITEM_CLASSES}>
          <svg viewBox="0 0 24 24" {...ICON}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
          <span className="min-[900px]:block max-[900px]:hidden">Settings</span>
        </Link>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <div className="rounded-xl border border-[#232B36] bg-[#141A22] p-3.5 min-[900px]:block max-[900px]:hidden">
            <b className="mb-1 block text-[12.5px] text-white">
              Extension not installed
            </b>
            <p className="mb-2.5 text-[11px] leading-relaxed text-[#8B96A4]">
              Save startups from any page in one click.
            </p>
            <a
              href="#"
              className="block rounded-lg bg-emerald py-2 text-center text-xs font-semibold text-white hover:bg-emerald-dark"
            >
              Get the extension
            </a>
          </div>
        </div>
      </aside>

      {/* ---- Main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-paper/90 px-8 py-4 backdrop-blur">
          <span className="font-serif text-lg font-semibold text-charcoal min-[640px]:hidden">
            Scout
          </span>

          <form
            className="flex max-w-[420px] flex-1 items-center gap-2.5 rounded-pill border border-line-strong bg-white px-4 py-2"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem(
                "q",
              ) as HTMLInputElement | null;
              const q = input?.value.trim();
              if (q) void navigate({ to: "/startups", search: { q } });
            }}
          >
            <svg
              viewBox="0 0 24 24"
              {...ICON}
              className="h-[15px] w-[15px] shrink-0 stroke-muted-2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              name="q"
              type="search"
              placeholder="Search startups, jobs, notes…"
              className="flex-1 bg-transparent text-[13.5px] text-charcoal outline-none placeholder:text-muted-2"
            />
          </form>

          <div className="ml-auto flex items-center gap-3.5">
            <div className="relative" ref={feedRef}>
              <button
                aria-label="Notifications"
                onClick={() => setFeedOpen((open) => !open)}
                className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-white hover:border-charcoal"
              >
                <svg
                  viewBox="0 0 24 24"
                  {...ICON}
                  className="h-4 w-4 stroke-charcoal"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {unread > 0 ? (
                  <>
                    <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-emerald ring-2 ring-white" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-semibold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  </>
                ) : null}
              </button>
              {feedOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2">
                  <NotificationFeed onNavigate={() => setFeedOpen(false)} />
                </div>
              ) : null}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-pill border border-line-strong bg-white py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-charcoal"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-[11px] font-bold text-white">
                  {initialsOf(displayName)}
                </div>
                <span className="hidden text-[12.5px] font-semibold text-charcoal sm:block">
                  {user?.full_name?.split(" ")[0] || user?.email}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  {...ICON}
                  className="hidden h-3 w-3 stroke-muted-2 sm:block"
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-lg"
                >
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-[13px] font-semibold text-charcoal">
                      {user?.full_name?.trim() || "Scout user"}
                    </p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      void logout().then(() => window.location.assign("/login"))
                    }
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-brick transition-colors hover:bg-brick-tint/50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      {...ICON}
                      className="h-4 w-4 shrink-0 stroke-current"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1180px] p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
