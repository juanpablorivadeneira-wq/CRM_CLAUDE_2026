'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

const totpSchema = z.object({
  totpCode: z.string().length(6, 'Debe ser 6 dígitos'),
});

type LoginValues = z.infer<typeof loginSchema>;
type TotpValues = z.infer<typeof totpSchema>;

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [pendingCredentials, setPendingCredentials] = useState<LoginValues | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const totpForm = useForm<TotpValues>({ resolver: zodResolver(totpSchema) });

  async function onCredentials(values: LoginValues) {
    setLoading(true);
    const res = await signIn('credentials', {
      ...values,
      redirect: false,
    });
    setLoading(false);

    if (res?.error === '2FA_REQUIRED') {
      setPendingCredentials(values);
      setStep('totp');
      return;
    }

    if (res?.error) {
      toast({ variant: 'destructive', title: 'Error al iniciar sesión', description: 'Email o contraseña incorrectos.' });
      return;
    }

    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    router.push(callbackUrl);
    router.refresh();
  }

  async function onTotp(values: TotpValues) {
    if (!pendingCredentials) return;
    setLoading(true);
    const res = await signIn('credentials', {
      ...pendingCredentials,
      totpCode: values.totpCode,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      toast({ variant: 'destructive', title: 'Código incorrecto', description: 'Verifica tu aplicación de autenticación.' });
      return;
    }

    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex w-full justify-center rounded-lg bg-sidebar-background px-6 py-4">
            <Image
              src="/logo.png"
              alt="BuildKontrol"
              width={919}
              height={169}
              priority
              className="h-12 w-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground">CRM comercial · Ecosistema BuildKontrol</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              {step === 'credentials' ? 'Iniciar sesión' : 'Verificación en dos pasos'}
            </CardTitle>
            <CardDescription>
              {step === 'credentials'
                ? 'Ingresa tus credenciales para acceder.'
                : 'Ingresa el código de 6 dígitos de tu aplicación de autenticación.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'credentials' ? (
              <form onSubmit={loginForm.handleSubmit(onCredentials)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ingresar
                </Button>
              </form>
            ) : (
              <form onSubmit={totpForm.handleSubmit(onTotp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totpCode">Código de verificación</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    {...totpForm.register('totpCode')}
                  />
                  {totpForm.formState.errors.totpCode && (
                    <p className="text-sm text-destructive">{totpForm.formState.errors.totpCode.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('credentials')}>
                    Volver
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          BK-CRM · BuildKontrol © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
