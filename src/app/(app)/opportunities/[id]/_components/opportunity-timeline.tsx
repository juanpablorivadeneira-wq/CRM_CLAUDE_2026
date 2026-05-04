'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  MessageCircle, Mail, Phone, Calendar, FileText,
  ArrowRight, Bot, User, Cog,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageCircle,
  call: Phone,
  in_app: MessageCircle,
  meeting: Calendar,
  note: FileText,
} as const;

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  call: 'Llamada',
  in_app: 'En la app',
  meeting: 'Reunión',
  note: 'Nota',
} as const;

const APPT_LABELS = {
  phone_call: 'Llamada',
  video_call: 'Videollamada',
  office_visit: 'Visita en oficina',
  site_visit: 'Visita al proyecto',
  client_office: 'Reunión en cliente',
  technical_visit: 'Visita técnica',
} as const;

type Message = {
  id: string;
  channel: keyof typeof CHANNEL_ICONS;
  direction: 'inbound' | 'outbound' | 'internal';
  body: string;
  subject: string | null;
  actorType: 'human' | 'ai' | 'system';
  sentByName: string | null;
  createdAt: Date;
};

type Appointment = {
  id: string;
  type: keyof typeof APPT_LABELS;
  status: string;
  startsAt: Date;
  vendorName: string;
  notes: string | null;
};

type StageMove = {
  id: string;
  movedAt: Date;
  fromStageId: string | null;
  toStageId: string;
  note: string | null;
  actorType: 'human' | 'ai' | 'system';
};

type Props = {
  messages: Message[];
  appointments: Appointment[];
  stageHistory: StageMove[];
  stages: { id: string; name: string }[];
};

export function OpportunityTimeline({ messages, appointments, stageHistory, stages }: Props) {
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));

  // Combinar todos los eventos en una línea de tiempo
  type Event =
    | { kind: 'message'; data: Message; date: Date }
    | { kind: 'appointment'; data: Appointment; date: Date }
    | { kind: 'stage'; data: StageMove; date: Date };

  const events: Event[] = [
    ...messages.map((m) => ({ kind: 'message' as const, data: m, date: m.createdAt })),
    ...appointments.map((a) => ({ kind: 'appointment' as const, data: a, date: a.startsAt })),
    ...stageHistory.map((s) => ({ kind: 'stage' as const, data: s, date: s.movedAt })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">Sin actividad. Registra el primer mensaje o llamada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((ev) => {
        if (ev.kind === 'message') {
          const m = ev.data;
          const Icon = CHANNEL_ICONS[m.channel];
          return (
            <div key={m.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`rounded-full p-2 ${m.direction === 'inbound' ? 'bg-blue-100' : 'bg-primary/10'}`}>
                  <Icon className={`h-4 w-4 ${m.direction === 'inbound' ? 'text-blue-600' : 'text-primary'}`} />
                </div>
                <div className="flex-1 w-px bg-border my-1" />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{CHANNEL_LABELS[m.channel]}</Badge>
                  <Badge variant="secondary" className="text-xs">
                    {m.direction === 'inbound' ? 'Recibido' : m.direction === 'outbound' ? 'Enviado' : 'Interno'}
                  </Badge>
                  {m.actorType === 'ai' && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Bot className="h-3 w-3" /> IA
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(m.createdAt, "dd MMM HH:mm", { locale: es })}
                  </span>
                </div>
                {m.subject && <p className="font-medium text-sm mt-1">{m.subject}</p>}
                <p className="mt-1 text-sm whitespace-pre-wrap">{m.body}</p>
                {m.sentByName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Por {m.sentByName}
                  </p>
                )}
              </div>
            </div>
          );
        }

        if (ev.kind === 'appointment') {
          const a = ev.data;
          return (
            <div key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-purple-100 p-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 w-px bg-border my-1" />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{APPT_LABELS[a.type]}</Badge>
                  <Badge variant="secondary" className="text-xs">{a.status}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(a.startsAt, "dd MMM yyyy HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-sm mt-1">Cita con {a.vendorName}</p>
                {a.notes && <p className="text-sm text-muted-foreground mt-1">{a.notes}</p>}
              </div>
            </div>
          );
        }

        const s = ev.data;
        const fromName = s.fromStageId ? stageNameById.get(s.fromStageId) : null;
        const toName = stageNameById.get(s.toStageId);
        return (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-muted p-2">
                {s.actorType === 'ai' ? (
                  <Bot className="h-4 w-4 text-muted-foreground" />
                ) : s.actorType === 'system' ? (
                  <Cog className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 w-px bg-border my-1" />
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm">
                {fromName ? (
                  <>
                    Movido de <span className="font-medium">{fromName}</span> a{' '}
                    <span className="font-medium">{toName}</span>
                  </>
                ) : (
                  <>Etapa inicial: <span className="font-medium">{toName}</span></>
                )}
              </p>
              {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
              <span className="text-xs text-muted-foreground">
                {format(s.movedAt, "dd MMM yyyy HH:mm", { locale: es })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
