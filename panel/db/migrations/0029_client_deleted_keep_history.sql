-- "Eliminar conservando historial": si el cliente tiene cobros o acuerdos, se
-- borran todos sus datos (contenido, archivos, tickets, metricas, accesos,
-- cuentas del portal...) pero queda la fila del cliente con estado
-- 'eliminado' y sus cobros/acuerdos (los acuerdos se desactivan). No aparece
-- mas en ninguna lista del panel; sus cobros siguen en Finanzas.
alter type public.client_status add value if not exists 'eliminado';
alter table public.clients add column if not exists deleted_at timestamptz;
