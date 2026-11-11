-- Biblioteca de contenido: los archivos que produce marketing (fotos,
-- videos, diseños) viven en el bucket de Railway, organizados por cliente y
-- carpeta. Se suben directo desde el navegador con una URL firmada (el
-- archivo no pasa por el server). Una fila queda 'pending' hasta que el
-- navegador confirma que termino la subida; las que quedan colgadas se
-- limpian solas.

create table if not exists public.content_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  -- carpeta virtual, ej. "2026-11" o "2026-11/Reels" ('' = raiz)
  folder text not null default '',
  filename text not null,
  content_type text not null,
  size_bytes bigint not null default 0,
  storage_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'ready')),
  -- pieza del calendario a la que pertenece (el portal del cliente la puede ver)
  content_item_id uuid references public.content_items(id) on delete set null,
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_files_client_folder_idx on public.content_files (client_id, folder, created_at desc);
create index if not exists content_files_item_idx on public.content_files (content_item_id);
create index if not exists content_files_pending_idx on public.content_files (status, created_at) where status = 'pending';
