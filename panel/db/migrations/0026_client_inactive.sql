-- Estado "inactivo" para clientes: reversible. Mientras esta inactivo, sus
-- usuarios no entran al portal, no se sincroniza Meta, no corren sus
-- alertas del Radar y no aparece en los selectores.
alter type public.client_status add value if not exists 'inactivo';
