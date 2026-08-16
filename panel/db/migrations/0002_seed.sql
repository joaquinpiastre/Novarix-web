-- Datos de prueba — SOLO para desarrollo local.
-- Crea 3 usuarios de prueba (admin, programmer, marketing) con contraseña
-- "novarix123" para los tres, y datos de ejemplo. No usar en producción.

do $$
declare
  v_admin uuid;
  v_programmer uuid;
  v_marketing uuid;
  v_client_a uuid;
  v_client_b uuid;
  v_agreement uuid;
begin
  insert into public.profiles (email, password_hash, full_name, role) values
    ('admin@novarix.test', crypt('novarix123', gen_salt('bf')), 'Admin de prueba', 'admin')
    returning id into v_admin;
  insert into public.profiles (email, password_hash, full_name, role) values
    ('programador@novarix.test', crypt('novarix123', gen_salt('bf')), 'Programador de prueba', 'programmer')
    returning id into v_programmer;
  insert into public.profiles (email, password_hash, full_name, role) values
    ('marketing@novarix.test', crypt('novarix123', gen_salt('bf')), 'Marketing de prueba', 'marketing')
    returning id into v_marketing;

  insert into public.clients (name, notes) values
    ('Ceramicasa', 'Cliente de e-commerce y marketing')
    returning id into v_client_a;
  insert into public.clients (name, notes) values
    ('Hospital Español del Sur', 'App institucional para socios')
    returning id into v_client_b;

  insert into public.recurring_agreements (client_id, amount, billing_day, concept)
  values (v_client_a, 45000, 5, 'Mantenimiento y hosting del sistema de pedidos')
  returning id into v_agreement;

  -- 3 meses ya cobrados, el mes actual queda pendiente a propósito
  insert into public.payments_in (client_id, recurring_agreement_id, amount, concept, period_month, date_received, created_by)
  values
    (v_client_a, v_agreement, 45000, 'Mantenimiento y hosting del sistema de pedidos', date_trunc('month', current_date - interval '3 months')::date, current_date - interval '3 months', v_admin),
    (v_client_a, v_agreement, 45000, 'Mantenimiento y hosting del sistema de pedidos', date_trunc('month', current_date - interval '2 months')::date, current_date - interval '2 months', v_admin),
    (v_client_a, v_agreement, 45000, 'Mantenimiento y hosting del sistema de pedidos', date_trunc('month', current_date - interval '1 month')::date, current_date - interval '1 month', v_admin);

  -- pago puntual
  insert into public.payments_in (client_id, amount, concept, date_received, created_by)
  values (v_client_b, 380000, 'Desarrollo de app institucional', current_date - interval '10 days', v_admin);

  if v_programmer is not null then
    insert into public.payments_out (recipient_id, amount, concept, period_month, paid_on, created_by)
    values
      (v_programmer, 220000, 'Sueldo', date_trunc('month', current_date - interval '1 month')::date, current_date - interval '1 month', v_admin),
      (v_programmer, 220000, 'Sueldo', date_trunc('month', current_date)::date, current_date, v_admin);

    insert into public.tasks (title, description, assigned_to, status, due_date, created_by)
    values ('Terminar integración de pagos', 'Conectar el checkout con el nuevo proveedor', v_programmer, 'in_progress', current_date + interval '3 days', v_admin);
  end if;

  if v_marketing is not null then
    insert into public.payments_out (recipient_id, amount, concept, period_month, paid_on, created_by)
    values (v_marketing, 180000, 'Sueldo', date_trunc('month', current_date)::date, current_date, v_admin);

    insert into public.tasks (title, description, assigned_to, status, created_by)
    values ('Preparar campaña de fin de mes', 'Piezas para Meta Ads', v_marketing, 'pending', v_admin);
  end if;

  insert into public.tasks (title, description, status, created_by)
  values ('Renovar dominio novarix.agency', null, 'pending', v_admin);

  insert into public.reminders (owner_id, title, remind_at)
  values
    (v_admin, 'Llamar a Ceramicasa por el cobro pendiente', now() + interval '1 day'),
    (v_admin, 'Revisar vencimiento de certificados SSL', now() + interval '5 days');
end $$;
