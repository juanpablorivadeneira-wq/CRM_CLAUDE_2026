'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type CustomField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
};

type Props = {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
};

export function DynamicField({ field, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.type === 'text' && (
        <Input
          id={field.key}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {field.type === 'textarea' && (
        <Textarea
          id={field.key}
          rows={3}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {field.type === 'number' && (
        <Input
          id={field.key}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {field.type === 'date' && (
        <Input
          id={field.key}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {field.type === 'select' && (
        <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === 'boolean' && (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={field.key}
            checked={!!value}
            onCheckedChange={(v) => onChange(!!v)}
            disabled={disabled}
          />
          <Label htmlFor={field.key} className="cursor-pointer font-normal">
            Sí
          </Label>
        </div>
      )}
    </div>
  );
}

export function DynamicFieldsForm({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: CustomField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <DynamicField
          key={f.key}
          field={f}
          value={values[f.key]}
          onChange={(v) => onChange(f.key, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
