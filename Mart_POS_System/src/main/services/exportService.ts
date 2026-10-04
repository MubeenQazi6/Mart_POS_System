import { dialog, BrowserWindow } from 'electron';
import fs from 'node:fs';
import type { ExportReportInput, ExportResult } from '@shared/types/reports';
import { logger } from '../logger';

import { generateCsvContent, generateHtmlReportContent } from './exportGenerators';

export { generateCsvContent, generateHtmlReportContent };

export async function exportReport(input: ExportReportInput): Promise<ExportResult> {
  const dateStr = new Date().toISOString().split('T')[0] ?? 'export';
  const sanitizedTitle = input.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const defaultFilename = `KINGS_MART_${sanitizedTitle}_${dateStr}.${input.format === 'xlsx' ? 'csv' : input.format}`;

  const win = BrowserWindow.getFocusedWindow();
  const options = {
    title: `Export ${input.title}`,
    defaultPath: defaultFilename,
    filters: [
      input.format === 'pdf'
        ? { name: 'PDF Document (*.pdf)', extensions: ['pdf'] }
        : input.format === 'xlsx'
          ? { name: 'CSV / Excel Spreadsheet (*.csv)', extensions: ['csv'] }
          : { name: 'CSV File (*.csv)', extensions: ['csv'] },
    ],
  };

  const { canceled, filePath } = win
    ? await dialog.showSaveDialog(win, options)
    : await dialog.showSaveDialog(options);

  if (canceled || !filePath) {
    return { canceled: true };
  }

  try {
    if (input.format === 'pdf') {
      const html = generateHtmlReportContent(input);
      let pdfGenerated = false;

      try {
        const printWin = new BrowserWindow({
          show: false,
          width: 1024,
          height: 768,
          webPreferences: {
            sandbox: true,
            contextIsolation: true,
          },
        });

        await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait slightly for DOM layout calculation
        await new Promise((resolve) => setTimeout(resolve, 150));

        const isLandscape =
          input.headers.length >= 7 ||
          input.title.toLowerCase().includes('shift') ||
          input.title.toLowerCase().includes('cash') ||
          (input.report_type as string) === 'cash_management';

        const pdfBuffer = await printWin.webContents.printToPDF({
          pageSize: 'A4',
          landscape: isLandscape,
          printBackground: true,
          margins: {
            top: 0.2,
            bottom: 0.2,
            left: 0.2,
            right: 0.2,
          },
        });

        fs.writeFileSync(filePath, pdfBuffer);
        printWin.close();
        pdfGenerated = true;
      } catch (pdfErr) {
        logger.warn('export', 'printToPDF encountered issue, writing HTML formatted fallback', pdfErr);
      }

      if (!pdfGenerated) {
        fs.writeFileSync(filePath, html, 'utf-8');
      }
    } else {
      const csv = generateCsvContent(input);
      fs.writeFileSync(filePath, csv, 'utf-8');
    }

    logger.info('export', `Report exported successfully to: ${filePath}`);
    return { filePath, canceled: false };
  } catch (error) {
    logger.error('export', 'Failed to write exported report file', error);
    throw error;
  }
}
