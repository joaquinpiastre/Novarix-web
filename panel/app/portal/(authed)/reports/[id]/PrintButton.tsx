"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <span className="inline-flex items-center gap-1.5">
        <Printer className="h-4 w-4" /> Descargar PDF
      </span>
    </Button>
  );
}
