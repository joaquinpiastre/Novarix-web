-- Fase 4: rol para usuarios del portal del cliente. Va solo en este
-- archivo por la misma razon que 0010 (un ADD VALUE de enum no puede
-- compartir transaccion con algo que use el valor nuevo).
alter type public.user_role add value if not exists 'client';
