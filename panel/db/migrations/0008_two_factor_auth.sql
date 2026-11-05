-- 2FA por TOTP, opcional para cualquier rol. totp_secret se guarda cifrado
-- (ver lib/crypto/encryption.ts), nunca en texto plano.

alter table public.profiles
  add column if not exists totp_secret text,
  add column if not exists totp_enabled boolean not null default false;

create table if not exists public.totp_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists totp_recovery_codes_profile_idx
  on public.totp_recovery_codes (profile_id);
