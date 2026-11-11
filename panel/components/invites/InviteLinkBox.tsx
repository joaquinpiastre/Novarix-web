"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

/**
 * Muestra el link de invitacion recien creado para compartirlo a mano
 * (copiar o WhatsApp). Es de un solo uso y vence en 72 h; solo lo ve quien
 * acaba de crear la invitacion.
 */
export function InviteLinkBox({ email, link, emailed }: { email: string; link: string; emailed: boolean }) {
  const [copied, setCopied] = useState(false);
  const message = `Hola! Te invito al portal de Novarix, donde vas a ver tu contenido, métricas y tickets. Entrá con este link para crear tu contraseña (vence en 72 horas): ${link}`;
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-success/40 bg-success/5 p-3">
      <p className="text-sm text-success">
        Invitación creada para {email}.{" "}
        {emailed ? "También le llegó por email." : "Mandale este link (el envío por email no está configurado):"}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs text-text-primary"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary hover:bg-surface-hover"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-medium text-white hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </div>
      <p className="text-xs text-text-muted">Es de un solo uso y vence en 72 horas. Con ese link la persona crea su contraseña y entra a su portal.</p>
    </div>
  );
}
