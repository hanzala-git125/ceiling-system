import { Customer, CustomerLedgerEntry, Supplier, SupplierLedgerEntry } from '../types';

interface LedgerPdfRow {
  date: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
}

function toPdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatCurrency(value: number, showSign = false): string {
  const sign = showSign && value < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeFilename(value: string): string {
  const filename = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return filename || 'party';
}

function wrapText(value: string, maxLength: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    if (word.length > maxLength) {
      if (line) {
        lines.push(line);
        line = '';
      }
      for (let index = 0; index < word.length; index += maxLength) {
        lines.push(word.slice(index, index + maxLength));
      }
      return;
    }

    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) lines.push(line);
  return lines.length > 0 ? lines : ['—'];
}

function createPdf(linesByPage: string[][]): Uint8Array {
  const pageIds = linesByPage.map((_, index) => 5 + index * 2);
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  linesByPage.forEach((lines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = lines.join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function downloadLedgerPdf(
  partyType: 'Customer' | 'Supplier',
  partyName: string,
  partyDetails: string[],
  entries: LedgerPdfRow[],
  outstanding: number
): void {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let y = 0;

  const addText = (text: string, x: number, fontSize = 9, bold = false, textY = y) => {
    currentPage.push(`BT /${bold ? 'F2' : 'F1'} ${fontSize} Tf 1 0 0 1 ${x} ${textY} Tm (${toPdfText(text)}) Tj ET`);
  };
  const addRule = () => {
    currentPage.push(`0.6 w 36 ${y} m 559 ${y} l S`);
  };
  const addTableHeader = () => {
    y -= 18;
    addText('Date', 36, 8, true);
    addText('Type', 100, 8, true);
    addText(partyType === 'Customer' ? 'Sales/Charges' : 'Purchases', 180, 8, true);
    addText(partyType === 'Customer' ? 'Paid by Customer' : 'Paid to Supplier', 260, 8, true);
    addText('Balance', 340, 8, true);
    addText('Description', 420, 8, true);
    y -= 7;
    addRule();
    y -= 15;
  };
  const startPage = (pageNumber: number) => {
    currentPage = [];
    pages.push(currentPage);
    y = 800;
    addText('Prime Plate Factory ERP', 36, 16, true);
    y -= 18;
    addText('Premium Industrial Manufactured Plates', 36, 9);
    y -= 13;
    addText('Sargodha Road, Gujranwala, Pakistan', 36, 9);
    y -= 13;
    addText('Phone: +92 55 1234567 | Email: billing@primeplates.com', 36, 9);
    y -= 21;
    addText(`${partyType} Account Ledger`, 36, 13, true);
    addText(`Page ${pageNumber}`, 520, 8);
    y -= 17;

    if (pageNumber === 1) {
      wrapText(`${partyType}: ${partyName}`, 90).forEach((line) => {
        addText(line, 36, 9, true);
        y -= 13;
      });
      partyDetails.flatMap((detail) => wrapText(detail, 90)).forEach((line) => {
        addText(line, 36, 9);
        y -= 13;
      });
      y -= 3;
      const balanceDescription = partyType === 'Customer'
        ? outstanding >= 0 ? 'Remaining amount customer owes us' : 'Customer credit balance'
        : outstanding >= 0 ? 'Remaining payable to supplier' : 'Supplier credit balance';
      addText(`${balanceDescription}: ${formatCurrency(outstanding)}`, 36, 11, true);
      y -= 17;
      addText(`Generated: ${new Date().toISOString().slice(0, 10)}`, 36, 8);
      y -= 12;
    }

    addTableHeader();
  };

  startPage(1);
  const rows = entries.length > 0 ? entries : [{
    date: '—',
    type: '—',
    debit: 0,
    credit: 0,
    balance: 0,
    description: 'No ledger transactions recorded',
  }];

  rows.forEach((entry) => {
    const descriptionLines = wrapText(entry.description, 31);
    const rowHeight = Math.max(17, descriptionLines.length * 9 + 8);
    if (y - rowHeight < 55) {
      startPage(pages.length + 1);
    }
    addText(entry.date, 36, 7.5);
    addText(entry.type, 100, 7.5);
    addText(formatCurrency(entry.debit), 180, 7.5);
    addText(formatCurrency(entry.credit), 260, 7.5);
    addText(formatCurrency(entry.balance, true), 340, 7.5);
    descriptionLines.forEach((line, index) => {
      addText(line, 420, 7.5, false, y - index * 9);
    });
    y -= rowHeight;
  });

  const content = pages.map((page, index) => {
    const footer = `BT /F1 8 Tf 1 0 0 1 36 25 Tm (Generated account ledger - ${index + 1} of ${pages.length}) Tj ET`;
    return [...page, footer];
  });
  const blob = new Blob([createPdf(content)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${partyType.toLowerCase()}-${safeFilename(partyName)}-ledger.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCustomerLedgerPdf(
  customer: Customer,
  entries: CustomerLedgerEntry[],
  outstanding: number
): void {
  downloadLedgerPdf(
    'Customer',
    customer.name,
    [`Phone: ${customer.phone || '—'}`, `Address: ${customer.address || '—'}`],
    entries.map((entry) => ({
      date: entry.date,
      type: entry.type,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.balance,
      description: entry.description,
    })),
    outstanding
  );
}

export function downloadSupplierLedgerPdf(
  supplier: Supplier,
  entries: SupplierLedgerEntry[],
  outstanding: number
): void {
  downloadLedgerPdf(
    'Supplier',
    supplier.name,
    [
      `Phone: ${supplier.phone || '—'}`,
      `Address: ${supplier.address || '—'}`,
      `Supplied materials: ${supplier.supplierMaterials.join(', ') || 'None listed'}`,
    ],
    entries.map((entry) => ({
      date: entry.date,
      type: entry.type,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.balance,
      description: entry.description,
    })),
    outstanding
  );
}
