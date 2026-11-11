"use client";

import { useState } from "react";
import clsx from "clsx";
import type { TabItem } from "@/components/ui/Tabs";

/**
 * Como components/ui/Tabs, pero mantiene montadas las pestañas ya visitadas
 * (ocultas), así lo que generó la IA en una herramienta no se pierde al
 * pasar a otra.
 */
export function KeepAliveTabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const [visited, setVisited] = useState<Set<string>>(new Set([defaultTab ?? items[0]?.id]));

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActive(item.id);
              setVisited((v) => new Set(v).add(item.id));
            }}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              item.id === active ? "border-accent text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) =>
        visited.has(item.id) ? (
          <div key={item.id} hidden={item.id !== active}>
            {item.content}
          </div>
        ) : null
      )}
    </div>
  );
}
