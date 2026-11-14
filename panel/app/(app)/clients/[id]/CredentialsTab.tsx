"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Eye, EyeOff, KeyRound, Pencil, Plus, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CREDENTIAL_PLATFORMS, platformLabel, platformUrl, type CredentialPlatform, type CredentialRow } from "@/lib/credentials/platforms";
import { deleteCredential, revealCredentialPassword, saveCredential } from "./credentialActions";

const HIDE_AFTER_MS = 30_000;

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%*?";
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary"
      title={label}
      aria-label={label}
    >
      {done ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function PasswordField({ credential, clientId }: { credential: CredentialRow; clientId: string }) {
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Se vuelve a ocultar sola.
  useEffect(() => {
    if (password == null) return;
    const t = setTimeout(() => setPassword(null), HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [password]);

  if (!credential.has_password) return <span className="text-xs text-text-muted">Sin contraseña cargada</span>;

  const reveal = (purpose: "ver" | "copiar") =>
    start(async () => {
      setError(null);
      const res = await revealCredentialPassword(credential.id, clientId, purpose);
      if (res.error || !res.password) {
        setError(res.error ?? "No se pudo obtener.");
        return;
      }
      if (purpose === "ver") setPassword(res.password);
      else {
        await navigator.clipboard?.writeText(res.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <code className="num min-w-0 flex-1 truncate rounded-lg bg-surface-hover px-2 py-1.5 text-sm text-text-primary">
          {password ?? "••••••••••"}
        </code>
        <button
          type="button"
          disabled={pending}
          onClick={() => (password != null ? setPassword(null) : reveal("ver"))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary"
          title={password != null ? "Ocultar" : "Mostrar"}
          aria-label={password != null ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {password != null ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => reveal("copiar")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary"
          title="Copiar contraseña"
          aria-label="Copiar contraseña"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

function CredentialForm({
  clientId,
  credential,
  onDone,
}: {
  clientId: string;
  credential: CredentialRow | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<CredentialPlatform>((credential?.platform as CredentialPlatform) ?? "instagram");
  const [label, setLabel] = useState(credential?.label ?? "");
  const [username, setUsername] = useState(credential?.username ?? "");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginUrl, setLoginUrl] = useState(credential?.login_url ?? "");
  const [twoFactor, setTwoFactor] = useState(credential?.two_factor ?? "");
  const [notes, setNotes] = useState(credential?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editing = Boolean(credential);

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>{editing ? "Editar acceso" : "Nuevo acceso"}</CardTitle>
      <form
        autoComplete="off"
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const res = await saveCredential({
              id: credential?.id,
              client_id: clientId,
              platform,
              label,
              username,
              password: editing && !passwordTouched ? undefined : password,
              notes,
              login_url: loginUrl,
              two_factor: twoFactor,
            });
            if (res.error) setError(res.error);
            else {
              onDone();
              router.refresh();
            }
          });
        }}
      >
        <Select label="Plataforma" value={platform} onChange={(e) => setPlatform(e.target.value as CredentialPlatform)}>
          {CREDENTIAL_PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Input label="Nombre (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: cuenta principal, @usuario" />
        <Input label="Usuario / email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Contraseña</span>
          <div className="flex gap-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordTouched(true);
              }}
              autoComplete="new-password"
              placeholder={editing && credential?.has_password ? "Dejala vacía para no cambiarla" : ""}
              className="min-h-10 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/70 focus:border-accent focus:outline-none"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-muted" aria-label="Mostrar u ocultar">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setPassword(generatePassword());
                setPasswordTouched(true);
                setShowPassword(true);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-muted"
              title="Generar una contraseña segura"
              aria-label="Generar contraseña"
            >
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
          {editing && passwordTouched && password === "" && <span className="text-xs text-warning">Se va a borrar la contraseña guardada.</span>}
        </div>
        <Input label="Link de ingreso (opcional)" value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} placeholder={platformUrl(platform) || "https://"} />
        <Input label="Verificación en 2 pasos (opcional)" value={twoFactor} onChange={(e) => setTwoFactor(e.target.value)} placeholder="Ej: código al celular del dueño" />
        <div className="sm:col-span-2">
          <Textarea label="Notas (opcional, se guardan cifradas)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preguntas de seguridad, códigos de respaldo, a quién pedirle el código…" />
        </div>
        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
          <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}

export function CredentialsTab({ clientId, credentials }: { clientId: string; credentials: CredentialRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CredentialRow | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-text-muted">
            Usuarios y contraseñas de las cuentas del cliente. Se guardan <strong className="text-text-primary">cifrados</strong>, la contraseña se ve solo al tocar
            “Mostrar” (y se oculta sola a los 30 s) y <strong className="text-text-primary">cada vez que alguien la mira o la copia queda registrado</strong>. El cliente no ve esta pestaña.
          </p>
        </div>
        {editing == null && (
          <Button onClick={() => setEditing("new")} className="shrink-0">
            <Plus className="h-4 w-4" /> Agregar acceso
          </Button>
        )}
      </Card>

      {editing && <CredentialForm clientId={clientId} credential={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}

      {credentials.length === 0 && editing == null ? (
        <Card className="text-sm text-text-muted">Todavía no hay accesos cargados para este cliente.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {credentials.map((c) => {
            const url = c.login_url || platformUrl(c.platform);
            return (
              <Card key={c.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <KeyRound className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{platformLabel(c.platform)}</p>
                      {c.label && <p className="truncate text-xs text-text-muted">{c.label}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Abrir el login">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button type="button" onClick={() => setEditing(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Editar" aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`¿Eliminar el acceso de ${platformLabel(c.platform)}${c.label ? ` (${c.label})` : ""}?`)) return;
                        start(async () => {
                          await deleteCredential(c.id, clientId);
                          router.refresh();
                        });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-danger"
                      title="Eliminar"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
                  <span className="text-xs text-text-muted">Usuario</span>
                  {c.username ? (
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-text-primary">{c.username}</span>
                      <CopyButton value={c.username} label="Copiar usuario" />
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                  <span className="text-xs text-text-muted">Contraseña</span>
                  <PasswordField credential={c} clientId={clientId} />
                </div>

                {c.two_factor && <Badge className="self-start" tone="warning">2 pasos: {c.two_factor}</Badge>}
                {c.notes && (
                  <details className="text-xs text-text-muted">
                    <summary className="cursor-pointer text-text-primary">Notas</summary>
                    <p className="mt-1 whitespace-pre-line">{c.notes}</p>
                  </details>
                )}
                <p className="text-[11px] text-text-muted">
                  Actualizado {new Date(c.updated_at).toLocaleDateString("es-AR")}
                  {c.updated_by_name ? ` por ${c.updated_by_name}` : ""}
                  {c.last_revealed_at
                    ? ` · Vista por última vez ${new Date(c.last_revealed_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}${c.last_revealed_by_name ? ` por ${c.last_revealed_by_name}` : ""}`
                    : ""}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
