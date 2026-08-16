-- Permite registrar un pago puntual como "pendiente de cobro": date_received
-- null significa que todavía no se cobró. Al marcarlo como cobrado, se
-- completa esa fecha (ver updateOneOffPayment / markOneOffCollected).
alter table public.payments_in alter column date_received drop not null;
