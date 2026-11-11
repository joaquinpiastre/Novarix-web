"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";

/** Selector de cliente que vive en la URL (?client=…), así el link se puede compartir. */
export function ClientPicker({ clients, value, param = "client" }: { clients: { id: string; name: string }[]; value: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return (
    <div className="max-w-sm">
      <Select
        label="Cliente"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(search.toString());
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        <option value="">Elegí un cliente…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
