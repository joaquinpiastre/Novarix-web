"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/utils/dates";
import type { NotificationRow } from "@/lib/types/domain";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";

export function NotificationBell({
  notifications,
  placement = "down",
}: {
  notifications: NotificationRow[];
  /** "up": se abre hacia arriba (cuando la campana está abajo, en el menú lateral). */
  placement?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        aria-label="Notificaciones"
      >
        <Bell size={16} />
        {unread.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Cerrar notificaciones"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-card ${
              placement === "up" ? "bottom-full left-0 mb-2" : "right-0 mt-2"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
              {unread.length > 0 && (
                <form action={markAllNotificationsRead}>
                  <button type="submit" className="text-xs text-accent hover:underline">
                    Marcar todas leídas
                  </button>
                </form>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-text-muted">Sin notificaciones.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li key={n.id} className={`flex items-start gap-2 px-4 py-3 ${n.read ? "opacity-60" : ""}`}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => setOpen(false)}
                          className="flex-1 hover:text-accent"
                        >
                          <p className="text-sm text-text-primary">{n.title}</p>
                          {n.body && <p className="text-xs text-text-muted">{n.body}</p>}
                          <p className="mt-1 text-[11px] text-text-muted">{formatDateTime(n.created_at)}</p>
                        </Link>
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">{n.title}</p>
                          {n.body && <p className="text-xs text-text-muted">{n.body}</p>}
                          <p className="mt-1 text-[11px] text-text-muted">{formatDateTime(n.created_at)}</p>
                        </div>
                      )}
                      {!n.read && (
                        <form action={markNotificationRead}>
                          <input type="hidden" name="id" value={n.id} />
                          <button type="submit" className="text-[11px] text-accent hover:underline">
                            Leída
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
