import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Eliminación de datos — Novarix" },
  description: "Cómo pedir la eliminación de los datos que Novarix obtuvo de Facebook, Instagram u otras plataformas.",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-text-muted sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Instrucciones para eliminar tus datos</h1>
      <p className="mt-4">
        Si conectaste tu cuenta de Facebook, Instagram o Meta Ads con el panel de <strong className="text-text-primary">Novarix Digital Agency</strong>, podés
        quitar el acceso y pedir que borremos los datos de cualquiera de estas formas:
      </p>

      <h2 className="mt-6 text-base font-semibold text-text-primary">1. Quitar el acceso desde Facebook</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Entrá a Facebook → Configuración y privacidad → Configuración.</li>
        <li>Abrí “Integraciones comerciales” (o “Apps y sitios web”).</li>
        <li>Buscá “Novarix Panel” y tocá “Eliminar”.</li>
      </ol>
      <p className="mt-2">Desde ese momento dejamos de recibir datos nuevos de tu cuenta.</p>

      <h2 className="mt-6 text-base font-semibold text-text-primary">2. Pedirnos que borremos lo guardado</h2>
      <p className="mt-2">
        Escribinos a <a className="text-accent underline" href="mailto:contacto@novarix.agency">contacto@novarix.agency</a> con el asunto “Eliminación de
        datos”, indicando el nombre de la página o cuenta de Instagram. Borramos la conexión, las métricas y el contenido asociados dentro de los 30 días y te
        confirmamos por email. Solo conservamos los registros de facturación que exige la ley.
      </p>

      <h2 className="mt-6 text-base font-semibold text-text-primary">3. Si sos cliente de Novarix</h2>
      <p className="mt-2">
        En tu portal de clientes, desde la sección Métricas, o pidiéndoselo a tu contacto en Novarix, podés desconectar Facebook e Instagram en cualquier
        momento.
      </p>

      <p className="mt-8">
        Más información en nuestra{" "}
        <Link className="text-accent underline" href="/privacidad">
          política de privacidad
        </Link>
        .
      </p>
    </main>
  );
}
