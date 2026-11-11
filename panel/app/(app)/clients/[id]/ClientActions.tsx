"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import type { ClientStatus } from "@/lib/types/domain";
import { deleteClient, setClientStatus } from "../actions";

/** Acciones de la ficha del cliente: editar, inactivar/reactivar y eliminar (solo admin). */
export function ClientActions({
  clientId,
  name,
  status,
  canManage,
  canDelete,
}: {
  clientId: string;
  name: string;
  status: ClientStatus;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  if (!canManage) return null;
  const inactive = status === "inactivo";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => router.push(`${pathname}?tab=resumen&editar=1`)}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
        <Button
          variant={inactive ? "primary" : "secondary"}
          disabled={pending}
          onClick={() => {
            const msg = inactive
              ? `¿Reactivar a ${name}? Sus usuarios vuelven a poder entrar al portal.`
              : `¿Marcar a ${name} como inactivo? Sus usuarios no van a poder entrar al portal, se pausa la sincronización de Meta y sus alertas del Radar, y deja de aparecer en los selectores. Se puede reactivar cuando quieras.`;
            if (!confirm(msg)) return;
            start(async () => {
              setError(null);
              const res = await setClientStatus(clientId, inactive ? "activo" : "inactivo");
              if (res.error) setError(res.error);
              else router.refresh();
            });
          }}
        >
          <Power className="h-4 w-4" /> {inactive ? "Reactivar" : "Marcar inactivo"}
        </Button>
        {canDelete && (
          <Button variant="danger" onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      <Dialog open={deleting} onOpenChange={(o) => { setDeleting(o); if (!o) { setConfirmName(""); setError(null); } }}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto p-5">
          <DialogTitle className="text-base font-semibold text-danger">Eliminar cliente</DialogTitle>
          <div className="mt-3 flex flex-col gap-3 text-sm">
            <p className="text-text-primary">
              Se borra <strong>{name}</strong> con <strong>todo</strong> lo suyo: contenido, archivos de la biblioteca, tickets, métricas, búsquedas del Radar,
              ideas y las cuentas de su portal. <strong>No se puede deshacer.</strong>
            </p>
            <p className="text-text-muted">
              Si solo dejó de trabajar con ustedes, mejor usá <em>Marcar inactivo</em>: se conserva todo y se puede reactivar. Si tiene cobros registrados, no se
              puede eliminar (para no perder el historial financiero).
            </p>
            <Input label={`Para confirmar, escribí: ${name}`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
            {error && <p className="text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(false)}>Cancelar</Button>
              <Button
                variant="danger"
                disabled={pending || confirmName.trim() !== name.trim()}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const res = await deleteClient(clientId, confirmName);
                    // Si sale bien, la accion redirige a /clients.
                    if (res?.error) setError(res.error);
                  })
                }
              >
                {pending ? "Eliminando…" : "Eliminar definitivamente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
