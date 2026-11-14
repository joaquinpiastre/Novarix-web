-- Accesos de cada cliente (Google, Facebook, Instagram, etc.). Usuario,
-- contraseña y notas se guardan CIFRADOS (AES-256-GCM con ENCRYPTION_KEY,
-- lib/crypto/encryption.ts): en la base nunca hay texto plano. Cada vez que
-- alguien muestra o copia una contraseña queda en audit_log
-- (credentials.reveal). No se exponen al portal ni al asistente de IA.

create table if not exists public.client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null,
  label text,
  username_enc text,
  password_enc text,
  notes_enc text,
  login_url text,
  -- donde llega el codigo de verificacion (ej. "celular del dueño"); no es secreto
  two_factor text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_revealed_at timestamptz,
  last_revealed_by uuid references public.profiles(id) on delete set null
);
create index if not exists client_credentials_client_idx on public.client_credentials (client_id, platform);
