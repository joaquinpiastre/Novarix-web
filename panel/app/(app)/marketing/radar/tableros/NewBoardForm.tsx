"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createBoard } from "../actions";

export function NewBoardForm({ clients, requireClient }: { clients: { id: string; name: string }[]; requireClient: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <form
        className="grid gap-3 sm:grid-cols-4 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await createBoard({ name, description, client_id: clientId || null });
            if (res.error !== undefined) setError(res.error);
            else router.push(`/marketing/radar/tableros/${res.id}`);
          });
        }}
      >
        <Input label="Nuevo tablero" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Ganchos de antes y después" />
        <Input label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">{requireClient ? "Elegí un cliente…" : "Temático (sin cliente)"}</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button type="submit" disabled={pending || !name.trim()}>
          <Plus className="h-4 w-4" /> Crear
        </Button>
        {error && <p className="text-sm text-danger sm:col-span-4">{error}</p>}
      </form>
    </Card>
  );
}
