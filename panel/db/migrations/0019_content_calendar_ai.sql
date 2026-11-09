-- Calendario de grabacion de contenido + asistente de IA.

-- ===== Contenido: fecha de grabacion, redes multiples, guion y notas =====
alter table public.content_items
  add column if not exists recording_at timestamptz,
  add column if not exists channels text[] not null default '{}',
  add column if not exists script text,
  add column if not exists notes text;

-- `channel` (texto unico) queda por compatibilidad: el codigo nuevo escribe
-- `channels` y mantiene `channel` como la lista unida por coma.
update public.content_items
   set channels = array[channel]
 where cardinality(channels) = 0 and channel is not null and channel <> '';

create index if not exists content_items_recording_idx on public.content_items (recording_at);
create index if not exists content_items_assigned_idx on public.content_items (assigned_to);

-- ===== Asistente de IA =====
-- Una conversacion por hilo, privada de quien la creo. `messages` guarda el
-- historial tal cual lo devuelve/recibe la API de Claude (bloques de
-- contenido incluidos), porque hay que reenviarlo sin modificar en cada turno.
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Nueva conversación',
  messages jsonb not null default '[]'::jsonb,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_profile_idx on public.ai_conversations (profile_id, updated_at desc);
