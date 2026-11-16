-- "Quitar" una cuenta de Meta antes solo la desactivaba (active = false) y sus
-- metricas seguian sumandose al cliente: aparecian publicaciones y gasto de
-- otras empresas del mismo portfolio. Ahora quitar borra la cuenta; aca se
-- borran las que ya estaban quitadas. Sus metricas (pauta, redes,
-- publicaciones) se van en cascada. Nada mas pone active = false.
delete from public.meta_assets where active = false;
