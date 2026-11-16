import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Política de privacidad — Novarix" },
  description: "Cómo Novarix Digital Agency trata los datos en su panel y en las integraciones con Meta, Google y otros servicios.",
};

const UPDATED = "15 de noviembre de 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold text-text-primary">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-text-muted sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Política de privacidad</h1>
      <p className="mt-1 text-xs">Última actualización: {UPDATED}</p>

      <p className="mt-6">
        Esta política explica cómo <strong className="text-text-primary">Novarix Digital Agency</strong> (“Novarix”, Mendoza, Argentina) trata los datos
        personales y de negocio en su panel de gestión (<span className="text-text-primary">panel.novarix.agency</span>), en el portal de clientes y en las
        integraciones con plataformas de terceros como Meta (Facebook e Instagram) y Google (YouTube). Contacto:{" "}
        <a className="text-accent underline" href="mailto:contacto@novarix.agency">contacto@novarix.agency</a>.
      </p>

      <H2>1. Qué datos tratamos</H2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <strong className="text-text-primary">Cuentas del panel y del portal:</strong> nombre, email, rol y contraseña (guardada solo como hash). Registro de
          accesos y acciones para seguridad.
        </li>
        <li>
          <strong className="text-text-primary">Datos de las empresas clientes:</strong> datos de contacto, servicios contratados, planes de marketing,
          calendario de contenido, tickets de soporte, archivos que se suben al panel y datos de facturación de los servicios.
        </li>
        <li>
          <strong className="text-text-primary">Datos de Meta (Facebook, Instagram y Meta Ads)</strong>, solo cuando el titular conecta su cuenta y autoriza el
          acceso: nombre e identificador de las páginas, cuentas de Instagram profesionales y cuentas publicitarias que elige compartir; métricas de esas
          cuentas (alcance, interacciones, seguidores, vistas, guardados, compartidos, tiempo de reproducción) y métricas de las campañas (inversión,
          impresiones, clics, resultados). El acceso es <strong className="text-text-primary">de solo lectura</strong>: no publicamos, no enviamos mensajes ni
          gastamos dinero desde esa conexión.
        </li>
        <li>
          <strong className="text-text-primary">Contenido público de redes</strong> (por ejemplo, publicaciones públicas de cuentas profesionales o videos
          públicos de YouTube) para análisis de tendencias: guardamos metadatos y métricas, nunca descargamos ni volvemos a publicar los videos.
        </li>
      </ul>

      <H2>2. Para qué los usamos</H2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Prestar los servicios de marketing contratados: reportes, diagnósticos, planes y calendario de contenido.</li>
        <li>Mostrarle al cliente sus propias métricas en su portal.</li>
        <li>Generar análisis y sugerencias con herramientas de inteligencia artificial sobre los datos del propio cliente.</li>
        <li>Seguridad, prevención de abusos y cumplimiento de obligaciones legales.</li>
      </ul>
      <p className="mt-2">
        No vendemos ni alquilamos datos personales, y no usamos los datos obtenidos de Meta o Google para fines distintos a prestar el servicio al cliente que
        los autorizó.
      </p>

      <H2>3. Con quién los compartimos</H2>
      <p className="mt-2">Solo con proveedores que necesitamos para operar el servicio, que los procesan en nuestro nombre:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Railway (alojamiento del panel, base de datos y archivos).</li>
        <li>Anthropic (modelo de inteligencia artificial Claude, para análisis y sugerencias).</li>
        <li>Meta y Google, como fuente de los datos que el cliente autoriza.</li>
      </ul>
      <p className="mt-2">
        El uso de datos de YouTube se rige además por los{" "}
        <a className="text-accent underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          Términos de servicio de YouTube
        </a>{" "}
        y la{" "}
        <a className="text-accent underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Política de privacidad de Google
        </a>
        .
      </p>

      <H2>4. Cuánto tiempo los guardamos</H2>
      <p className="mt-2">
        Mientras dure la relación comercial con el cliente o hasta que se desconecte la integración. Las estadísticas de videos de YouTube de terceros se
        refrescan o eliminan a los 30 días. Al eliminar un cliente se borran sus datos; solo conservamos los registros de facturación que exige la ley.
      </p>

      <H2>5. Seguridad</H2>
      <p className="mt-2">
        Los tokens de acceso a las plataformas y las credenciales se guardan cifrados. El acceso al panel requiere usuario y contraseña (con verificación en
        dos pasos opcional), cada persona ve solo los clientes que tiene asignados y las acciones sensibles quedan registradas.
      </p>

      <H2>6. Tus derechos</H2>
      <p className="mt-2">
        Podés pedir acceso, rectificación o eliminación de tus datos escribiendo a{" "}
        <a className="text-accent underline" href="mailto:contacto@novarix.agency">contacto@novarix.agency</a>, conforme a la Ley 25.326 de Protección de Datos
        Personales de la República Argentina. La Agencia de Acceso a la Información Pública es el órgano de control de esa ley. Para eliminar los datos
        obtenidos de Facebook o Instagram, mirá las{" "}
        <Link className="text-accent underline" href="/eliminacion-de-datos">
          instrucciones de eliminación de datos
        </Link>
        .
      </p>

      <H2>7. Cambios</H2>
      <p className="mt-2">Si cambiamos esta política, actualizamos la fecha de arriba.</p>
    </main>
  );
}
