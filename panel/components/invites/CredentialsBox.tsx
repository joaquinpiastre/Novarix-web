"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

/**
 * Credenciales recien creadas (o restablecidas) de un usuario del portal.
 * Se muestran una sola vez: la contraseña no se guarda en texto plano.
 */
export function CredentialsBox({
  title,
  fullName,
  email,
  password,
  loginUrl,
  mustChange,
  onClose,
}: {
  title: string;
  fullName: string;
  email: string;
  password: string;
  loginUrl: string;
  mustChange: boolean;
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const message =
    `Hola ${fullName.split(" ")[0]}! Ya tenés tu acceso al portal de Novarix, donde vas a ver tu contenido, métricas y tickets.\n\n` +
    `Entrá en: ${loginUrl}\nUsuario: ${email}\nContraseña: ${password}` +
    (mustChange ? "\n\nLa primera vez te va a pedir que pongas una contraseña nueva." : "");

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-success/40 bg-success/5 p-4">
      <p className="text-sm font-medium text-success">{title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">Ingreso</dt>
        <dd className="break-all text-text-primary">{loginUrl}</dd>
        <dt className="text-text-muted">Usuario</dt>
        <dd className="break-all text-text-primary">{email}</dd>
        <dt className="text-text-muted">Contraseña</dt>
        <dd className="num select-all font-semibold text-text-primary">{password}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(message).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary hover:bg-surface-hover"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar datos"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-medium text-white hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Mandar por WhatsApp
        </a>
        {onClose && (
          <button type="button" onClick={onClose} className="min-h-10 px-2 text-sm text-text-muted underline">
            Listo
          </button>
        )}
      </div>
      <p className="text-xs text-text-muted">
        Guardala o mandala ahora: la contraseña no se vuelve a mostrar (si se pierde, usá “Nueva contraseña”).
        {mustChange ? " En el primer ingreso le va a pedir que la cambie." : ""}
      </p>
    </div>
  );
}
