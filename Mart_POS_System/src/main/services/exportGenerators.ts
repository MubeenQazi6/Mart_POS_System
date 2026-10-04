import type { ExportReportInput } from '@shared/types/reports';
import { getSetting } from '../../repositories/settings';

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvContent(input: ExportReportInput): string {
  const lines: string[] = [];

  // Title
  lines.push(escapeCsvField(`MARTPOS — ${input.title.toUpperCase()}`));
  lines.push(escapeCsvField(`Generated on: ${new Date().toLocaleString('en-PK')}`));
  lines.push('');

  // Summary lines if any
  if (input.summaryLines && input.summaryLines.length > 0) {
    lines.push('--- SUMMARY ---');
    for (const s of input.summaryLines) {
      lines.push(`${escapeCsvField(s.label)},${escapeCsvField(s.value)}`);
    }
    lines.push('');
  }

  // Header
  lines.push(input.headers.map(escapeCsvField).join(','));

  // Rows
  for (const row of input.rows) {
    lines.push(row.map(escapeCsvField).join(','));
  }

  // Prepend UTF-8 BOM for Excel compatibility
  return `\uFEFF${lines.join('\r\n')}`;
}

export function generateHtmlReportContent(input: ExportReportInput): string {
  const filterDetails: string[] = [];
  if (input.filters?.date_from || input.filters?.date_to) {
    const fromStr = input.filters.date_from ? `From: ${input.filters.date_from}` : '';
    const toStr = input.filters.date_to ? `To: ${input.filters.date_to}` : '';
    filterDetails.push([fromStr, toStr].filter(Boolean).join(' '));
  }
  if (input.filters?.payment_method) {
    filterDetails.push(`Payment: ${input.filters.payment_method.toUpperCase()}`);
  }
  if (input.filters?.status) {
    filterDetails.push(`Status: ${input.filters.status.toUpperCase()}`);
  }
  if (input.filters?.category_id) {
    filterDetails.push(`Category ID: ${input.filters.category_id}`);
  }

  const filterBannerHtml = filterDetails.length > 0
    ? `<div style="font-size: 11px; color: #475569; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; margin-bottom: 16px; display: inline-block;">
        <strong>Active Filters:</strong> ${filterDetails.join(' &bull; ')}
       </div>`
    : '';

  const summaryHtml = input.summaryLines && input.summaryLines.length > 0
    ? `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
        ${input.summaryLines
          .map(
            (s) =>
              `<div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${s.label}</div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">${s.value}</div>
              </div>`,
          )
          .join('')}
       </div>`
    : '';

  const getColAlign = (header: string): 'left' | 'right' | 'center' => {
    const lower = header.toLowerCase();
    if (
      lower.includes('amount') ||
      lower.includes('total') ||
      lower.includes('cash') ||
      lower.includes('float') ||
      lower.includes('price') ||
      lower.includes('cost') ||
      lower.includes('value') ||
      lower.includes('balance') ||
      lower.includes('paid') ||
      lower.includes('discount') ||
      lower.includes('tax') ||
      lower.includes('subtotal') ||
      lower.includes('margin') ||
      lower.includes('diff') ||
      lower.includes('qty') ||
      lower.includes('quantity') ||
      lower.includes('count')
    ) {
      return 'right';
    }
    if (
      lower.includes('status') ||
      lower.includes('date') ||
      lower.includes('opened') ||
      lower.includes('closed') ||
      lower.includes('time') ||
      lower.includes('direction')
    ) {
      return 'center';
    }
    return 'left';
  };

  const isLandscape =
    input.headers.length >= 7 ||
    input.title.toLowerCase().includes('shift') ||
    input.title.toLowerCase().includes('cash') ||
    (input.report_type as string) === 'cash_management';

  const isVeryWide = input.headers.length >= 10;

  const thPadding = isVeryWide ? '5px 4px' : isLandscape ? '6px 6px' : '8px 10px';
  const tdPadding = isVeryWide ? '5px 4px' : isLandscape ? '6px 6px' : '7px 10px';
  const thFontSize = isVeryWide ? '8px' : isLandscape ? '9px' : '10px';
  const tdFontSize = isVeryWide ? '8px' : isLandscape ? '9px' : '10.5px';
  const thWhiteSpace = isVeryWide ? 'normal' : 'nowrap';
  const bodyPadding = isLandscape ? '12px 14px' : '16px 20px';

  const headersHtml = input.headers
    .map(
      (h) => {
        const align = getColAlign(h);
        return `<th style="border: 1px solid #cbd5e1; padding: ${thPadding}; background: #e2e8f0; text-align: ${align}; font-size: ${thFontSize}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; color: #1e293b; white-space: ${thWhiteSpace}; word-break: break-word;">${h}</th>`;
      }
    )
    .join('');

  const rowsHtml = input.rows.length === 0
    ? `<tr><td colspan="${input.headers.length}" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic; border: 1px solid #e2e8f0;">No matching records found for this period.</td></tr>`
    : input.rows
        .map(
          (row) =>
            `<tr style="page-break-inside: avoid;">${row
              .map(
                (cell, cIdx) => {
                  const align = getColAlign(input.headers[cIdx] ?? '');
                  const isNumeric = align === 'right';
                  const isDateOrStatus = align === 'center';
                  return `<td style="border: 1px solid #e2e8f0; padding: ${tdPadding}; font-size: ${tdFontSize}; color: #1e293b; text-align: ${align}; vertical-align: middle; word-break: break-word; ${isNumeric ? 'font-variant-numeric: tabular-nums; font-weight: 500;' : ''} ${isDateOrStatus && !isVeryWide ? 'white-space: nowrap;' : ''}">${String(cell ?? '—')}</td>`;
                }
              )
              .join('')}</tr>`,
        )
        .join('');

  const formattedTitle = input.title.replace(/_/g, ' ').toUpperCase();
  const storeName = getSetting('store.name') || 'Kings Mart';
  const storeLogo = getSetting('store.logo');

  const logoHtml = storeLogo
    ? `<img src="${storeLogo}" alt="${storeName}" style="max-height: 40px; max-width: 140px; object-fit: contain; margin-bottom: 6px; display: block;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MARTPOS — ${input.title}</title>
  <style>
    @page {
      size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
      margin: 0;
    }
    @media print {
      body { margin: 0; padding: ${bodyPadding}; }
      .no-print { display: none; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: ${bodyPadding};
      color: #0f172a;
      background: #ffffff;
      line-height: 1.4;
      width: 100%;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-name {
      font-size: 12px;
      font-weight: 800;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .subtitle {
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      table-layout: auto;
      box-sizing: border-box;
    }
    th, td {
      box-sizing: border-box;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .footer-box {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
    }
    .footer-brand {
      font-weight: 700;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      ${logoHtml}
      <div class="brand-name">${storeName} POS</div>
      <h1>${formattedTitle}</h1>
      <div class="subtitle">Generated on: ${new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'medium' })}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 11px; font-weight: 600; color: #334155;">Official Store Report</div>
      <div style="font-size: 10px; color: #94a3b8;">Confidential &bull; Store Copy</div>
    </div>
  </div>

  ${filterBannerHtml}
  ${summaryHtml}

  <table>
    <thead><tr>${headersHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer-box">
    <div>
      <span class="footer-brand">Kings Mart Point of Sale</span> &bull; Authoritative Database Report
    </div>
    <div style="text-align: right;">
      Powered by <strong>Kings Mart POS</strong> &bull; Developed by <strong>Zenthropic Technologies</strong>
    </div>
  </div>
</body>
</html>`;
}
