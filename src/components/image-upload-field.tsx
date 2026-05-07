'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ImageUploadField({
  value,
  onChange,
  prefix = 'uploads',
  label = 'Imagen',
  disabled,
}: {
  value: string | null | undefined;
  onChange: (url: string) => void;
  prefix?: string;
  label?: string;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('prefix', prefix);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({ variant: 'destructive', title: 'No se pudo subir', description: data.error ?? `HTTP ${res.status}` });
        return;
      }
      onChange(data.url);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error de red', description: String(err) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-start gap-3">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {value ? 'Cambiar imagen' : 'Subir imagen'}
            </Button>
            {value && !uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange('')}
              >
                <X className="mr-1 h-4 w-4" /> Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o WebP. Máx 10 MB.
          </p>
        </div>
      </div>
    </div>
  );
}
