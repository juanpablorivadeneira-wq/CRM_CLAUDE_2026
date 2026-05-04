import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { TotpSetup } from './_components/totp-setup';
import { TotpDisable } from './_components/totp-disable';

export default async function SecurityPage() {
  const ctx = await getTenantContext();
  const user = await db.user.findUnique({ where: { id: ctx.userId } });

  return (
    <>
      <PageHeader title="Seguridad" description="Protege tu cuenta con verificación en dos pasos." />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {user?.twoFactorEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                )}
                Autenticación en dos pasos (2FA)
              </CardTitle>
              <CardDescription>
                Añade una capa de seguridad usando una app como Google Authenticator, Authy o 1Password.
              </CardDescription>
            </div>
            <Badge variant={user?.twoFactorEnabled ? 'default' : 'outline'}>
              {user?.twoFactorEnabled ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {user?.twoFactorEnabled ? <TotpDisable /> : <TotpSetup />}
        </CardContent>
      </Card>
    </>
  );
}
