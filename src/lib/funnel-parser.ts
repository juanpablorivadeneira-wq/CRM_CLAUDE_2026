/**
 * Parser para CSVs/Excel exportados del funnel de ventas.
 *
 * El funnel de cada proyecto tiene preguntas distintas. Este módulo:
 *  - Detecta las 4 columnas estándar (fecha, nombre, email, teléfono) con sinónimos es/en
 *  - Mapea el resto a Opportunity.data usando el slug del header
 *  - Sugiere mapeo a customFields del ProjectType cuando hay match por similitud
 *  - Normaliza teléfonos en notación científica (Excel exporta números como 5.93E+11)
 */

const STANDARD_ALIASES = {
  date: ['fecha', 'date', 'created', 'created_at', 'createdat', 'fecha_creacion', 'timestamp'],
  name: ['nombre', 'name', 'nombrecliente', 'nombre_cliente', 'nombredelcliente', 'nombre_del_cliente', 'cliente', 'fullname', 'full_name'],
  email: ['email', 'correo', 'mail', 'e_mail', 'correo_electronico', 'correoelectronico'],
  phone: ['telefono', 'tel', 'phone', 'celular', 'movil', 'numero', 'whatsapp', 'wsp', 'wa'],
} as const;

export type StandardKey = keyof typeof STANDARD_ALIASES;

export type FieldMapping =
  | { kind: 'standard'; field: StandardKey }
  | { kind: 'data'; key: string; label: string }
  | { kind: 'ignore' };

export type ColumnDetection = {
  index: number;
  header: string;
  slug: string;
  suggested: FieldMapping;
};

export type CustomField = { key: string; label: string };

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function slugifyHeader(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[¿?¡!()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function detectStandard(slug: string): StandardKey | null {
  for (const key of Object.keys(STANDARD_ALIASES) as StandardKey[]) {
    if ((STANDARD_ALIASES[key] as readonly string[]).includes(slug)) return key;
  }
  // partial match (contains)
  for (const key of Object.keys(STANDARD_ALIASES) as StandardKey[]) {
    if ((STANDARD_ALIASES[key] as readonly string[]).some((alias) => slug.includes(alias))) return key;
  }
  return null;
}

function suggestCustomFieldKey(slug: string, customFields: CustomField[]): CustomField | null {
  for (const cf of customFields) {
    const cfSlug = slugifyHeader(cf.label);
    if (cfSlug === slug) return cf;
    if (cf.key && slug.includes(cf.key)) return cf;
    if (cfSlug && (slug.includes(cfSlug) || cfSlug.includes(slug))) return cf;
  }
  return null;
}

export function detectColumns(headers: string[], customFields: CustomField[]): ColumnDetection[] {
  const usedStandards = new Set<StandardKey>();
  return headers.map((header, index) => {
    const slug = slugifyHeader(header);
    const std = detectStandard(slug);
    if (std && !usedStandards.has(std)) {
      usedStandards.add(std);
      return { index, header, slug, suggested: { kind: 'standard', field: std } };
    }
    const cf = suggestCustomFieldKey(slug, customFields);
    if (cf) {
      return { index, header, slug, suggested: { kind: 'data', key: cf.key, label: cf.label } };
    }
    return { index, header, slug, suggested: { kind: 'data', key: slug || `col_${index + 1}`, label: header } };
  });
}

/**
 * Convierte un valor de celda a string preservando todos los dígitos
 * (Excel guarda teléfonos largos como número y los muestra como notación científica
 * en la celda, pero el valor crudo es el número completo).
 */
export function cellToPhoneString(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    // Forzar fixed-point (sin notación) y quitar trailing zeros decimales
    if (!Number.isFinite(v)) return '';
    const fixed = v.toFixed(0);
    return fixed;
  }
  return String(v).trim();
}

export function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '';
    return Number.isInteger(v) ? v.toFixed(0) : String(v);
  }
  return String(v).trim();
}

const DATE_REGEXES: Array<{ re: RegExp; build: (m: RegExpMatchArray) => Date | null }> = [
  // ISO 2026-01-12 17:28:38
  {
    re: /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/,
    build: (m) => new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0))),
  },
  // 12-01-2026 17:28:38  o  12/01/2026 17:28
  {
    re: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
    build: (m) => {
      const d = +m[1], mo = +m[2], y = +m[3];
      const h = +(m[4] ?? 0), mi = +(m[5] ?? 0), s = +(m[6] ?? 0);
      // Heurística: si el primer número es > 12, es D/M/Y (no ambiguo).
      // Si el segundo es > 12, es M/D/Y. Si ambos <=12, asumimos D/M/Y (Ecuador).
      const dayFirst = d > 12 || mo <= 12;
      const day = dayFirst ? d : mo;
      const month = dayFirst ? mo : d;
      return new Date(Date.UTC(y, month - 1, day, h, mi, s));
    },
  },
];

export function parseFunnelDate(raw: unknown): Date | null {
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') {
    // Excel date serial number (días desde 1899-12-30)
    if (raw > 25569 && raw < 80000) {
      const ms = (raw - 25569) * 86400 * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  for (const { re, build } of DATE_REGEXES) {
    const m = s.match(re);
    if (m) {
      const d = build(m);
      if (d && !isNaN(d.getTime())) return d;
    }
  }
  // Último intento: Date.parse
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export type ParsedRow = {
  rowIndex: number;
  date: Date | null;
  name: string;
  email: string | null;
  emailInvalid: boolean;
  phone: string | null;
  data: Record<string, string>;
  errors: string[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseFunnelRow(
  row: Record<string, unknown> | unknown[],
  columns: ColumnDetection[],
  mapping: FieldMapping[],
  rowIndex: number,
): ParsedRow {
  const headers = columns.map((c) => c.header);
  const valueAt = (i: number): unknown => {
    if (Array.isArray(row)) return row[i];
    return row[headers[i]];
  };

  const out: ParsedRow = {
    rowIndex,
    date: null,
    name: '',
    email: null,
    emailInvalid: false,
    phone: null,
    data: {},
    errors: [],
  };

  for (let i = 0; i < columns.length; i++) {
    const map = mapping[i];
    if (!map || map.kind === 'ignore') continue;
    const raw = valueAt(i);

    if (map.kind === 'standard') {
      switch (map.field) {
        case 'date':
          out.date = parseFunnelDate(raw);
          break;
        case 'name':
          out.name = cellToString(raw);
          break;
        case 'email': {
          const e = cellToString(raw).toLowerCase();
          if (!e) break;
          if (EMAIL_RE.test(e)) out.email = e;
          else {
            out.emailInvalid = true;
            out.errors.push(`Email inválido: "${e}"`);
          }
          break;
        }
        case 'phone':
          out.phone = cellToPhoneString(raw);
          break;
      }
    } else if (map.kind === 'data') {
      const v = cellToString(raw);
      if (v) out.data[map.key] = v;
    }
  }

  if (!out.name || out.name.length < 2) {
    out.errors.push('Falta nombre o es demasiado corto');
  }

  return out;
}
