import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Mail, Phone, MessageCircle, MapPin,
  User, Building, ArrowRight,
} from 'lucide-react';

const ORIGIN_LABELS = {
  meta_ads: 'Meta Ads',
  web_form: 'Formulario web',
  referral: 'Referido',
  trade_show: 'Feria',
  cold_call: 'Llamada en frío',
  whatsapp_inbound: 'WhatsApp',
  walk_in: 'Visita espontánea',
  other: 'Otro',
} as const;

const STATUS_LABELS = {
  open: 'Abierta',
  won: 'Ganada',
  lost: 'Perdida',
  paused: 'En pausa',
} as const;

const STATUS_VARIANTS = {
  open: 'default',
  won: 'default',
  lost: 'destructive',
  paused: 'secondary',
} as const;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const client = await db.client.findUnique({
    where: { id },
    include: {
      opportunities: {
        where: { deletedAt: null },
        include: {
          project: { select: { name: true } },
          stage: { select: { name: true, isWon: true, isLost: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!client || client.orgId !== ctx.orgId) notFound();

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" /> Clientes
          </Link>
        </Button>
      </div>

      <PageHeader title={client.name}>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {client.type === 'company' ? <Building className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {client.type === 'company' ? 'Empresa' : 'Persona'}
          </Badge>
          <Badge variant="secondary">{ORIGIN_LABELS[client.origin]}</Badge>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline text-base">Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline break-all">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="text-primary hover:underline">{client.phone}</a>
              </div>
            )}
            {client.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {client.whatsapp}
                </a>
              </div>
            )}
            {(client.address || client.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{[client.address, client.city].filter(Boolean).join(', ')}</span>
              </div>
            )}

            <hr className="my-2" />

            {client.ruc && <div className="text-muted-foreground font-mono text-xs">RUC: {client.ruc}</div>}
            {client.ci && <div className="text-muted-foreground font-mono text-xs">CI: {client.ci}</div>}
            {client.profession && <div className="text-muted-foreground text-xs">{client.profession}</div>}
            {(client.budgetMin || client.budgetMax) && (
              <div>
                <span className="text-muted-foreground text-xs">Presupuesto: </span>
                <span>
                  {client.budgetMin ? `$${client.budgetMin.toLocaleString()}` : '—'} a {' '}
                  {client.budgetMax ? `$${client.budgetMax.toLocaleString()}` : '—'}
                </span>
              </div>
            )}

            {client.notes && (
              <>
                <hr className="my-2" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-headline text-xl font-semibold">
            Oportunidades · {client.opportunities.length}
          </h2>

          {client.opportunities.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Este cliente aún no tiene oportunidades.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/pipeline">Crear desde el pipeline</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {client.opportunities.map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`}>
                  <Card className="transition-colors hover:border-primary">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium">{o.project.name}</span>
                          <Badge
                            variant={o.stage.isWon ? 'default' : o.stage.isLost ? 'destructive' : 'outline'}
                            className={o.stage.isWon ? 'bg-green-600' : ''}
                          >
                            {o.stage.name}
                          </Badge>
                          <Badge variant={STATUS_VARIANTS[o.status] as any}>
                            {STATUS_LABELS[o.status]}
                          </Badge>
                        </div>
                        {o.unitDetail && (
                          <p className="text-sm text-muted-foreground">{o.unitDetail}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Creada {format(o.createdAt, 'dd MMM yyyy', { locale: es })}</span>
                          {o.estimatedValue && <span>${o.estimatedValue.toLocaleString()}</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
