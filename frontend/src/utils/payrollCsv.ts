import { ImportPaySlipRow } from '../api/payrollApi';

const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = FORMULA_PREFIX_REGEX.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r;]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function triggerCsvDownload(filename: string, csvBody: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAccountingTemplateCsv(): void {
  const headers = [
    'staff_id',
    'base_pay',
    'night_differential',
    'overtime_pay',
    'on_call_allowance',
    'surgery_allowance',
    'kpi_bonus',
    'social_insurance',
    'tax_deductions',
    'other_deductions',
    'net_pay',
    'notes'
  ];
  const sampleRows = [
    ['EMP-DOC-001', '18000000', '2400000', '1600000', '1200000', '3500000', '2000000', '1890000', '610000', '0', '26200000', 'Bang luong TCKT'],
    ['EMP-NUR-001', '13500000', '1600000', '1200000', '800000', '0', '1000000', '1417500', '182500', '0', '16500000', 'Bang luong TCKT']
  ];
  const lines = [headers.join(','), ...sampleRows.map((r) => r.map(escapeCsvCell).join(','))];
  triggerCsvDownload('mau_bang_luong_ke_toan_benh_vien.csv', lines.join('\r\n'));
}

export function exportTimesheetsToCsv(exportData: {
  run: { id: string; start_date: string; end_date: string };
  rows: any[];
}): void {
  const headers = [
    'staff_id',
    'staff_name',
    'department_code',
    'department_name',
    'role',
    'base_hourly_rate',
    'tax_tier',
    'total_work_hours',
    'approved_overtime_hours',
    'night_shifts',
    'on_call_shifts',
    'surge_shifts',
    'approved_leave_days',
    'late_count',
    'kpi_score',
    'kpi_grade'
  ];

  const lines = [
    headers.join(','),
    ...(exportData.rows || []).map((row) =>
      headers.map((col) => escapeCsvCell(row[col])).join(',')
    )
  ];

  const filename = `bang_tong_hop_cong_truc_kpi_${exportData.run.start_date}_${exportData.run.end_date}.csv`;
  triggerCsvDownload(filename, lines.join('\r\n'));
}

export function exportBankDisbursementToCsv(disbursementData: {
  run: { id: string; start_date: string; end_date: string };
  rows: any[];
}): void {
  const headers = [
    'staff_id',
    'staff_name',
    'department_code',
    'department_name',
    'bank_name',
    'account_number',
    'routing_number',
    'net_pay',
    'transfer_reference',
    'missing_bank_account'
  ];

  const lines = [
    headers.join(','),
    ...(disbursementData.rows || []).map((row) =>
      headers.map((col) => escapeCsvCell(row[col])).join(',')
    )
  ];

  const start = String(disbursementData.run?.start_date || '').slice(0, 10);
  const end = String(disbursementData.run?.end_date || '').slice(0, 10);
  const filename = `uy_nhiem_chi_chuyen_khoan_${start}_${end}.csv`;
  triggerCsvDownload(filename, lines.join('\r\n'));
}

/**
 * Normalizes Vietnamese / English currency strings like "15,000,000", "15.000.000", "15 000 000 đ"
 */
export function parseVietnameseNumber(raw: string | undefined): number {
  if (!raw) return 0;
  let cleaned = String(raw).trim().replace(/[đĐ₫\s]/g, '');
  if (!cleaned) return 0;

  // Handle negative guard (kept as NaN or negative so validator flags it)
  // If string uses dots solely as thousand separators (e.g. 15.000.000 or 1.500.000)
  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  } else if (/^-?\d{1,3}(,\d{3})+$/.test(cleaned)) {
    // Commas solely as thousand separators (e.g. 15,000,000)
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

const DEFAULT_COLUMNS = [
  'staff_id',
  'base_pay',
  'night_differential',
  'overtime_pay',
  'on_call_allowance',
  'surgery_allowance',
  'kpi_bonus',
  'social_insurance',
  'tax_deductions',
  'other_deductions',
  'net_pay',
  'notes'
];

export function parseAccountingSpreadsheetText(
  rawText: string,
  defaultStatus: 'DRAFT' | 'CALCULATED' = 'CALCULATED'
): { rows: ImportPaySlipRow[]; errors: string[] } {
  const text = rawText.replace(/^\uFEFF/, '').trim();
  if (!text) {
    return { rows: [], errors: [] };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [] };
  }

  // Detect delimiter: Tab (Excel paste) -> Semicolon -> Comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(';') && !firstLine.includes(',')
    ? ';'
    : ',';

  const firstCells = splitDelimitedLine(firstLine, delimiter).map((c) => c.toLowerCase());
  const hasHeader =
    firstCells.includes('staff_id') ||
    firstCells.includes('employee_code') ||
    firstCells.includes('ma_nhan_vien') ||
    firstCells.includes('base_pay');

  const columns = hasHeader ? firstCells : DEFAULT_COLUMNS;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: ImportPaySlipRow[] = [];
  const errors: string[] = [];

  dataLines.forEach((line, idx) => {
    const lineNum = hasHeader ? idx + 2 : idx + 1;
    const cells = splitDelimitedLine(line, delimiter);
    const record: Record<string, string> = {};

    columns.forEach((col, colIdx) => {
      record[col] = cells[colIdx] ?? '';
    });

    const staffId = (record.staff_id || record.employee_code || record.ma_nhan_vien || '').trim();
    if (!staffId) {
      errors.push(`Dòng ${lineNum}: Thiếu mã nhân viên (staff_id).`);
      return;
    }

    const base_pay = parseVietnameseNumber(record.base_pay);
    const night_differential = parseVietnameseNumber(record.night_differential);
    const overtime_pay = parseVietnameseNumber(record.overtime_pay);
    const on_call_allowance = parseVietnameseNumber(record.on_call_allowance);
    const surgery_allowance = parseVietnameseNumber(record.surgery_allowance);
    const kpi_bonus = parseVietnameseNumber(record.kpi_bonus);
    const social_insurance = parseVietnameseNumber(record.social_insurance);
    const tax_deductions = parseVietnameseNumber(record.tax_deductions);
    const other_deductions = parseVietnameseNumber(record.other_deductions || record.deductions);

    const gross =
      base_pay + night_differential + overtime_pay + on_call_allowance + surgery_allowance + kpi_bonus;
    const rawNet = record.net_pay !== undefined && record.net_pay !== '' ? parseVietnameseNumber(record.net_pay) : undefined;
    const net_pay =
      rawNet !== undefined
        ? rawNet
        : Math.max(0, Math.round(gross - social_insurance - tax_deductions - other_deductions));

    if (
      base_pay < 0 ||
      night_differential < 0 ||
      overtime_pay < 0 ||
      on_call_allowance < 0 ||
      surgery_allowance < 0 ||
      kpi_bonus < 0 ||
      social_insurance < 0 ||
      tax_deductions < 0 ||
      other_deductions < 0 ||
      net_pay < 0
    ) {
      errors.push(`Dòng ${lineNum} (${staffId}): Giá trị tiền lương hoặc khấu trừ không được âm.`);
      return;
    }

    rows.push({
      staff_id: staffId,
      base_pay,
      night_differential,
      overtime_pay,
      on_call_allowance,
      surgery_allowance,
      kpi_bonus,
      social_insurance,
      tax_deductions,
      other_deductions,
      net_pay,
      status: defaultStatus,
      notes: record.notes ? record.notes.slice(0, 500) : null
    });
  });

  return { rows, errors };
}
