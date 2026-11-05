import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { TwoFactorSection } from "./TwoFactorSection";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { profile } = await getSessionProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Mi cuenta</h1>
        <p className="text-sm text-text-muted">{profile.email}</p>
      </div>

      <Card className="max-w-md">
        <CardTitle>Cambiar contraseña</CardTitle>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </Card>

      <Card className="max-w-md">
        <div className="flex items-center justify-between">
          <CardTitle>Verificación en dos pasos (2FA)</CardTitle>
          <Badge tone={profile.totp_enabled ? "success" : "neutral"}>
            {profile.totp_enabled ? "Activado" : "Desactivado"}
          </Badge>
        </div>
        <div className="mt-4">
          <TwoFactorSection enabled={profile.totp_enabled} />
        </div>
      </Card>
    </div>
  );
}
