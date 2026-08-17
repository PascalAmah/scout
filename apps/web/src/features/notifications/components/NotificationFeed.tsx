import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import type { NotificationOut } from "../api";
import { useMarkAllRead, useMarkRead, useNotifications } from "../hooks";
import {
  GROUPS,
  TONE_CLASSES,
  actionFor,
  groupOf,
  metaFor,
  relTime,
} from "./notificationMeta";

function actionLabel(
  n: NotificationOut,
): { label: string; to?: string } | null {
  const action = actionFor(n);
  return action ? { label: action.label, to: action.to } : null;
}

export function NotificationFeed({ onNavigate }: { onNavigate?: () => void }) {
  const notificationsQuery = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const items = notificationsQuery.data?.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  const shown = tab === "unread" ? items.filter((n) => !n.read_at) : items;

  const open = (n: NotificationOut) => {
    if (!n.read_at) markRead.mutate(n.id);
    onNavigate?.();
    const action = actionLabel(n);
    if (action?.to) void navigate({ to: action.to });
  };

  const grouped = GROUPS.map((label) => ({
    label,
    items: shown.filter((n) => groupOf(n.created_at) === label),
  })).filter((g) => g.items.length > 0);

  if (notificationsQuery.isLoading) {
    return (
      <p className="px-4.5 py-6 text-center text-sm text-muted">Loading…</p>
    );
  }
  if (notificationsQuery.isError) {
    return (
      <p className="px-4.5 py-6 text-center text-sm text-brick">
        Failed to load
      </p>
    );
  }

  return (
    <div className="flex max-h-[78vh] w-[400px] max-w-[90vw] flex-col overflow-hidden rounded-[18px] border border-line bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-line px-4.5 py-4">
        <h2 className="m-0 text-[15px] font-semibold text-charcoal">
          Notifications
        </h2>
        {unread > 0 ? (
          <span className="rounded-pill bg-emerald-tint px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-dark">
            {unread} new
          </span>
        ) : null}
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="ml-auto text-[11.5px] font-semibold text-muted transition-colors hover:text-charcoal"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4.5 pt-2.5">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t
                ? "bg-charcoal text-white"
                : "text-muted hover:text-charcoal"
            }`}
          >
            {t === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {/* Scrollable list — the only region that scrolls (max-height on the panel) */}
      <div className="thin-scrollbar flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="px-4.5 py-4 text-center text-[11.5px] text-muted-2">
            {tab === "unread" ? "You're all caught up" : "No notifications yet"}
          </p>
        ) : (
          grouped.map((group, gi) => (
            <div key={group.label}>
              <p className="px-4.5 pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-2">
                {group.label}
              </p>
              {group.items.map((n, ni) => {
                const { tone, icon } = metaFor(n.type);
                const action = actionLabel(n);
                const isLast =
                  gi === grouped.length - 1 && ni === group.items.length - 1;
                return (
                  <div
                    key={n.id}
                    onClick={() => open(n)}
                    className={`relative flex cursor-pointer gap-[11px] px-4.5 py-3 transition-colors hover:bg-paper ${
                      isLast ? "" : "border-b border-line"
                    } ${
                      n.read_at
                        ? ""
                        : "bg-[linear-gradient(90deg,#E4F3EA_0%,rgba(228,243,234,0)_6%)]"
                    }`}
                  >
                    {!n.read_at ? (
                      <span
                        className="absolute left-1.5 top-[19px] h-1.5 w-1.5 rounded-full bg-emerald"
                        aria-hidden
                      />
                    ) : null}
                    <div
                      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${TONE_CLASSES[tone]}`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[12.5px] leading-snug text-charcoal">
                        <b className="font-semibold">{n.title}</b>
                        {n.body ? <span> — {n.body}</span> : null}
                      </p>
                      <span className="mt-0.5 block text-[11px] text-muted-2">
                        {relTime(n.created_at)}
                      </span>
                      {action ? (
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            className={`rounded-pill px-[11px] py-[5px] text-[11px] font-semibold transition-colors ${
                              n.entity_type === "application"
                                ? "border border-line-strong bg-white text-charcoal hover:border-charcoal"
                                : "bg-charcoal text-white hover:bg-near-black"
                            }`}
                          >
                            {action.label}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line py-3 text-center">
        <a
          href="/notifications"
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.();
            void navigate({ to: "/notifications" });
          }}
          className="text-xs font-semibold text-emerald-dark hover:underline"
        >
          View all notifications
        </a>
      </div>
    </div>
  );
}
