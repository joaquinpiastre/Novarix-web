"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AssetChooser } from "@/components/meta/AssetChooser";
import { getPortalMetaChoices, savePortalMetaChoices } from "./metaChoiceActions";

export function PortalAssetChooser({ clientName, initialOpen }: { clientName: string; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  if (!open) {
    return (
      <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
        Elegir mis cuentas
      </Button>
    );
  }
  return (
    <div className="rounded-xl border border-accent/40 bg-surface-hover p-4">
      <p className="mb-3 text-sm font-semibold text-text-primary">¿Qué cuentas son de {clientName}?</p>
      <AssetChooser clientName={clientName} load={getPortalMetaChoices} save={savePortalMetaChoices} onDone={() => setOpen(false)} />
    </div>
  );
}
