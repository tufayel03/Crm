import * as ExcelJS from 'exceljs';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const getCellText = (value: ExcelJS.CellValue | undefined) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString();
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text;
  }
  if (typeof value === 'object' && 'result' in value) {
    return (value as { result?: unknown }).result ?? '';
  }
  return String(value);
};

export const addSheetFromObjects = (workbook: ExcelJS.Workbook, name: string, rows: Record<string, any>[]) => {
  const sheet = workbook.addWorksheet(name);
  if (!rows || rows.length === 0) return sheet;

  const headers = Object.keys(rows[0]);
  sheet.columns = headers.map((header) => ({ header, key: header }));
  rows.forEach((row) => sheet.addRow(row));
  return sheet;
};

export const createWorkbookFromJson = (sheetName: string, rows: Record<string, any>[]) => {
  const wb = new ExcelJS.Workbook();
  addSheetFromObjects(wb, sheetName, rows);
  return wb;
};

export const workbookToBlob = async (workbook: ExcelJS.Workbook) => {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: XLSX_MIME });
};

export const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const blob = await workbookToBlob(workbook);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const makeUniqueHeaders = (rawHeaders: string[]) => {
  const seen = new Map<string, number>();
  return rawHeaders.map((header) => {
    const base = String(header || '').trim();
    if (!base) return '';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  }).filter(Boolean);
};

export const sheetToJson = (sheet: ExcelJS.Worksheet) => {
  const headerRow = sheet.getRow(1);
  const rawHeaders = headerRow.values
    .slice(1)
    .map((h) => String(h || '').trim());
  const headers = makeUniqueHeaders(rawHeaders);

  const rows: Record<string, any>[] = [];
  for (let i = 2; i <= sheet.rowCount; i += 1) {
    const row = sheet.getRow(i);
    const rowData: Record<string, any> = {};
    headers.forEach((header, idx) => {
      const cell = row.getCell(idx + 1);
      rowData[header] = getCellText(cell.value);
    });
    const hasData = Object.values(rowData).some((v) => v !== '' && v !== null && v !== undefined);
    if (hasData) rows.push(rowData);
  }

  return rows;
};

export const loadWorkbookFromArrayBuffer = async (buffer: ArrayBuffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
};

export const parseCsvToJson = (csvText: string) => {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  const pushCell = () => {
    row.push(current);
    current = '';
  };

  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === ',') {
      pushCell();
      continue;
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      pushCell();
      pushRow();
      continue;
    }
    current += char;
  }
  pushCell();
  if (row.length) pushRow();

  if (rows.length === 0) return [];

  const rawHeaders = rows[0].map((h) => String(h || '').trim());
  const headers = makeUniqueHeaders(rawHeaders);
  return rows.slice(1).map((r) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      obj[header] = r[idx] ?? '';
    });
    return obj;
  }).filter((r) => Object.values(r).some((v) => v !== '' && v !== null && v !== undefined));
};
