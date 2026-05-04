'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { startTotpSetup, confirmTotpSetup } from '../actions';

type Step = 'idle' | 'qr' | 'verify' | 'backup';

export function TotpSetup() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function start() {
    setLoading(true);
    const res = await startTotpSetup();
    setSecret(res.secret);
    setQr(res.qrDataUrl);
    setStep('qr');
    setLoading(false);
  }

  async function verify() {
    setLoading(true);
    const res = await confirmTotpSetup({ secret, code });
    setLoading(false);
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }
    setBackupCodes(res.backupCodes ?? []);
    setStep('backup');
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadBackup() {
    const text = `BK-CRM — Códigos de respaldo 2FA\nGuárdalos en un lugar seguro. Cada uno se puede usar una sola vez.\n\n${backupCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bk-crm-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (step === 'idle') {
    return (
      <Button onClick={start} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Activar 2FA
      </Button>
    );
  }

  if (step === 'qr') {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">1. Escanea este QR con tu app de autenticación</h4>
          <p className="text-sm text-muted-foreground">Google Authenticator, Authy, 1Password, etc.</p>
        </div>
        <div className="rounded-lg border bg-white p-4 inline-block">
          {qr && <Image src={qr} alt="QR 2FA" width={200} height={200} />}
        </div>
        <div className="space-y-2">
          <Label>O introduce este código manualmente:</Label>
          <div className="flex gap-2">
            <Input value={secret} readOnly className="font-mono" />
            <Button variant="outline" size="icon" onClick={copySecret}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button onClick={() => setStep('verify')}>Continuar</Button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium">2. Ingresa el código de 6 dígitos</h4>
          <p className="text-sm text-muted-foreground">El que aparece ahora en tu app de autenticación.</p>
        </div>
        <div className="space-y-2 max-w-xs">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            className="text-center font-mono text-2xl tracking-widest"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('qr')}>Volver</Button>
          <Button onClick={verify} disabled={loading || code.length !== 6}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar y activar
          </Button>
        </div>
      </div>
    );
  }

  // step === 'backup'
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-green-700">✓ 2FA activado</h4>
        <p className="text-sm text-muted-foreground">
          Guarda estos códigos de respaldo. Cada uno se puede usar una sola vez si pierdes acceso a tu app.
        </p>
      </div>
      <div className="rounded-lg border bg-muted/50 p-4 grid grid-cols-2 gap-2 font-mono text-sm">
        {backupCodes.map((c) => <div key={c}>{c}</div>)}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={downloadBackup}>
          <Download className="mr-2 h-4 w-4" /> Descargar códigos
        </Button>
        <Button onClick={() => window.location.reload()}>He guardado los códigos</Button>
      </div>
    </div>
  );
}
