'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createOrganization, checkSlugAvailability } from './actions';

const formSchema = z.object({
  orgName: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  orgSlug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(40)
    .regex(/^[a-z][a-z0-9-]*$/, 'Solo minúsculas, números y guiones'),
  adminName: z.string().min(2, 'Nombre completo'),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .regex(/[A-Z]/, 'Al menos una mayúscula')
    .regex(/[a-z]/, 'Al menos una minúscula')
    .regex(/[0-9]/, 'Al menos un número'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar' }) }),
});

type FormValues = z.infer<typeof formSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { acceptTerms: false as any },
  });

  const orgSlug = form.watch('orgSlug');

  // Auto-generar slug desde el nombre
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name === 'orgName' && !form.getValues('orgSlug')) {
        const slug = (values.orgName ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40);
        if (slug) form.setValue('orgSlug', slug, { shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Validar disponibilidad del slug con debounce
  useEffect(() => {
    if (!orgSlug || orgSlug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    const t = setTimeout(async () => {
      const { available } = await checkSlugAvailability(orgSlug);
      setSlugStatus(available ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(t);
  }, [orgSlug]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const res = await createOrganization(values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({
      title: '¡Organización creada!',
      description: 'Tu cuenta está lista. Inicia sesión para comenzar.',
    });
    router.push('/login');
  }

  const rootDomain = process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN ?? 'bk-crm.com';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="font-headline text-3xl font-bold tracking-wider text-foreground flex items-center">
            <span>BK</span>
            <span className="mx-1 text-primary">—</span>
            <span>CRM</span>
          </div>
          <p className="text-sm text-muted-foreground">Crea tu cuenta · 14 días de prueba gratis</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Datos de tu empresa</CardTitle>
            <CardDescription>
              Tu cuenta inicia con un superadmin. Después podrás invitar a tu equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nombre de la empresa</Label>
                <Input id="orgName" placeholder="Constructora Acme" {...form.register('orgName')} />
                {form.formState.errors.orgName && (
                  <p className="text-sm text-destructive">{form.formState.errors.orgName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgSlug">Subdominio</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      id="orgSlug"
                      placeholder="acme"
                      className="pr-10"
                      {...form.register('orgSlug')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {slugStatus === 'available' && <Check className="h-4 w-4 text-green-600" />}
                      {slugStatus === 'taken' && <X className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.{rootDomain}</span>
                </div>
                {form.formState.errors.orgSlug && (
                  <p className="text-sm text-destructive">{form.formState.errors.orgSlug.message}</p>
                )}
                {slugStatus === 'taken' && !form.formState.errors.orgSlug && (
                  <p className="text-sm text-destructive">Ese subdominio ya está en uso</p>
                )}
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium">Tu cuenta de superadmin</h3>

                <div className="space-y-2">
                  <Label htmlFor="adminName">Nombre completo</Label>
                  <Input id="adminName" placeholder="Juan Pérez" {...form.register('adminName')} />
                  {form.formState.errors.adminName && (
                    <p className="text-sm text-destructive">{form.formState.errors.adminName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="tu@empresa.com"
                    {...form.register('adminEmail')}
                  />
                  {form.formState.errors.adminEmail && (
                    <p className="text-sm text-destructive">{form.formState.errors.adminEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 10 caracteres"
                      {...form.register('adminPassword')}
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
                  {form.formState.errors.adminPassword && (
                    <p className="text-sm text-destructive">{form.formState.errors.adminPassword.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    10+ caracteres con mayúsculas, minúsculas y números.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="acceptTerms"
                  checked={form.watch('acceptTerms') as any}
                  onCheckedChange={(v) => form.setValue('acceptTerms', v as any, { shouldValidate: true })}
                />
                <Label htmlFor="acceptTerms" className="text-sm font-normal leading-tight">
                  Acepto los términos del servicio y autorizo a BuildKontrol a procesar mis datos
                  según la política de privacidad.
                </Label>
              </div>
              {form.formState.errors.acceptTerms && (
                <p className="text-sm text-destructive">{form.formState.errors.acceptTerms.message}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading || slugStatus === 'taken'}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear cuenta
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta? <Link href="/login" className="text-primary hover:underline">Inicia sesión</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
