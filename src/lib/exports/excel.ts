'use client';

import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos a un archivo Excel y dispara la descarga.
 * Las claves del primer objeto definen las columnas.
 */
export function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  sheetName = 'Reporte',
) {
  if (rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-ancho de columnas
  const cols = Object.keys(rows[0]).map((key) => ({
    wch: Math.min(
      40,
      Math.max(
        key.length,
        ...rows.map((r) => String(r[key] ?? '').length),
      ),
    ),
  }));
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Exporta múltiples hojas (cada array de objetos = una hoja).
 */
export function exportToExcelMulti(
  sheets: { name: string; rows: Record<string, any>[] }[],
  filename: string,
) {
  const workbook = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    if (rows.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, ws, name);
  }
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
