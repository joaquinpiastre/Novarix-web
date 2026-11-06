-- Fase 1: nuevo rol marketing_admin. Va solo en este archivo, sin nada mas
-- que use el valor nuevo -- Postgres no permite usar un valor de enum
-- recien agregado dentro de la misma transaccion en la que se agrego, y
-- cada migracion corre en su propia transaccion (ver scripts/migrate.js).
alter type public.user_role add value if not exists 'marketing_admin';
