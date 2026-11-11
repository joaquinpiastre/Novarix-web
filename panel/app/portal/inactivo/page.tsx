import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOut } from "../../(app)/actions";

export const dynamic = "force-dynamic";

/** Pantalla para usuarios del portal cuya empresa esta marcada como inactiva en Novarix. */
export default function PortalInactivePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardTitle>Tu acceso está pausado</CardTitle>
        <p className="mt-2 text-sm text-text-muted">
          La cuenta de tu empresa en Novarix está inactiva por el momento. Si creés que es un error, escribinos y la reactivamos.
        </p>
        <form action={signOut} className="mt-4">
          <Button type="submit" variant="secondary" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </Card>
    </div>
  );
}
