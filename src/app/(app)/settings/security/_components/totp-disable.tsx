'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { disableTotp } from '../actions';

export function TotpDisable() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const res = await disableTotp({ code });
    setLoading(false);
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }
    toast({ title: '2FA desactivado' });
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Para desactivar 2FA, ingresa el código actual de tu app de autenticación.
      </p>
      <div className="space-y-2 max-w-xs">
        <Label>Código actual</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
          className="text-center font-mono text-xl tracking-widest"
        />
      </div>
      <Button variant="destructive" onClick={handle} disabled={loading || code.length !== 6}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Desactivar 2FA
      </Button>
    </div>
  );
}
