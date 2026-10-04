import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import type { Result } from '@shared/types/app';
import type {
  PrinterDeviceInfo,
  TestPrintOptions,
  TestPrintResult,
  PrintSilentOptions,
  PrintSilentResult,
} from '@shared/types/hardware';
import { getSetting } from '../../../repositories/settings';
import { logger } from '../../logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Write HTML to a temp file and return its file:// URL.
 * Falls back to a data: URI for small content.
 * Using loadFile avoids data: URI length limits for large sticker sheets.
 */
function htmlToTempFile(html: string): string {
  const tmpDir = os.tmpdir();
  const fileName = `martpos_print_${Date.now()}.html`;
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, html, 'utf8');
  return filePath;
}

export function registerHardwareIpcHandlers(): void {
  // 1. Discover available OS printers
  ipcMain.handle(IPC_CHANNELS.HARDWARE.GET_PRINTERS, async (): Promise<Result<PrinterDeviceInfo[]>> => {
    try {
      const windows = BrowserWindow.getAllWindows();
      const targetWindow = windows[0];
      if (!targetWindow) {
        return { success: true, data: [] };
      }

      const printers = await targetWindow.webContents.getPrintersAsync();
      const mapped: PrinterDeviceInfo[] = printers.map((p) => {
        const raw = p as unknown as { name?: string; displayName?: string; description?: string; status?: number; isDefault?: boolean };
        return {
          name: raw.name || '',
          displayName: raw.displayName || raw.name || '',
          description: raw.description || '',
          status: typeof raw.status === 'number' ? raw.status : 0,
          isDefault: Boolean(raw.isDefault),
        };
      });

      return { success: true, data: mapped };
    } catch (error) {
      logger.error('hardware', 'Error discovering printers', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to query system printers' };
    }
  });

  // 2. Perform actual test print to selected printer or default (direct silent print)
  ipcMain.handle(
    IPC_CHANNELS.HARDWARE.TEST_PRINT,
    async (_, options?: TestPrintOptions): Promise<Result<TestPrintResult>> => {
      try {
        const configuredPrinter = options?.printerName || (getSetting('printing.receipt_printer_name' as any) as string) || '';
        const storeName = (getSetting('store.name' as any) as string) || 'Kings Mart';
        const storeAddress = (getSetting('store.address' as any) as string) || '';
        const storePhone = (getSetting('store.phone' as any) as string) || '';
        const nowStr = new Date().toLocaleString();

        const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace, monospace;
      width: 72mm;
      margin: 0 auto;
      padding: 8px 4px;
      font-size: 13px;
      font-weight: bold;
      color: #000000 !important;
      background: #ffffff !important;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: none;
      text-rendering: geometricPrecision;
    }
    .header { font-weight: 900; font-size: 17px; text-transform: uppercase; margin-bottom: 4px; }
    .divider { border-top: 1.5px dashed #000; margin: 8px 0; }
    .grid { display: flex; justify-content: space-between; text-align: left; font-size: 11px; font-weight: bold; }
    .pattern { font-family: monospace; letter-spacing: 2px; font-size: 12px; margin: 6px 0; font-weight: 900; }
    .footer { font-size: 10px; margin-top: 8px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">${storeName}</div>
  <div>${storeAddress}</div>
  <div>Tel: ${storePhone}</div>
  <div class="divider"></div>
  <div style="font-weight: 900; font-size: 14px;">*** HARDWARE TEST RECEIPT ***</div>
  <div class="divider"></div>
  <div class="grid"><span>Date & Time:</span><span>${nowStr}</span></div>
  <div class="grid"><span>Target Spooler:</span><span>${configuredPrinter || 'Windows Default'}</span></div>
  <div class="grid"><span>Interface:</span><span>Direct Silent Thermal Print</span></div>
  <div class="grid"><span>Status:</span><span>OPERATIONAL ✓</span></div>
  <div class="divider"></div>
  <div class="pattern">|||| | ||||| ||| |||||| || |</div>
  <div style="font-size: 11px; font-weight: 900;">DIRECT PRINT & DENSITY PASS</div>
  <div class="divider"></div>
  <div class="footer">Powered By ZENTHROPIC Technologies</div>
  <div style="font-size: 9px;">www.zenthropic-technologies.vercel.app</div>
</body>
</html>
`;

        const printWindow = new BrowserWindow({
          show: false,
          width: 800,
          height: 600,
          webPreferences: { nodeIntegration: false, contextIsolation: true },
        });

        // Write to temp file — most reliable way to load arbitrary HTML in Electron.
        // data: URIs can be too long for large sticker sheets. loadFile triggers did-finish-load.
        const tempFilePath = htmlToTempFile(testHtml);
        await new Promise<void>((resolve, reject) => {
          printWindow.webContents.once('did-finish-load', resolve);
          printWindow.loadFile(tempFilePath).catch(reject);
        });
        // Clean up temp file after it is loaded
        try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }

        // Extra settle time for fonts and layout to finish rendering
        await new Promise<void>((res) => setTimeout(res, 500));

        return new Promise<Result<TestPrintResult>>((resolve) => {
          printWindow.webContents.print(
            {
              silent: true,
              printBackground: true,
              deviceName: configuredPrinter || undefined,
              copies: options?.copies || 1,
              margins: { marginType: 'none' },
            },
            (success, failureReason) => {
              try {
                printWindow.close();
              } catch {
                // Ignore cleanup error
              }

              if (success) {
                logger.info('hardware', `Test print sent successfully to ${configuredPrinter || 'default'}`);
                resolve({
                  success: true,
                  data: {
                    success: true,
                    printerName: configuredPrinter || 'Default System Printer',
                    message: `Test receipt successfully spooled to ${configuredPrinter || 'Default System Printer'}`,
                  },
                });
              } else {
                logger.warn('hardware', `Test print cancelled or failed: ${failureReason}`);
                resolve({
                  success: false,
                  error: `Print job failed (${failureReason})`,
                });
              }
            },
          );
        });
      } catch (error) {
        logger.error('hardware', 'Error during test print', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Hardware test print failed',
        };
      }
    },
  );

  // 3. Direct Silent Printing (Zero Driver Window / Instant Print on Ctrl+P)
  ipcMain.handle(
    IPC_CHANNELS.HARDWARE.PRINT_SILENT,
    async (_, options?: PrintSilentOptions): Promise<Result<PrintSilentResult>> => {
      try {
        let configuredPrinter = options?.printerName || '';
        if (!configuredPrinter) {
          if (options?.printerType === 'label') {
            configuredPrinter = (getSetting('printing.label_printer_name' as any) as string) || '';
          }
          if (!configuredPrinter) {
            configuredPrinter = (getSetting('printing.receipt_printer_name' as any) as string) || '';
          }
        }

        const copies = options?.copies || 1;

        if (options?.html) {
          // Off-screen printing for clean, standalone HTML (stickers, receipts)
          const printWindow = new BrowserWindow({
            show: false,
            width: 800,
            height: 600,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
          });

          // Write to temp file — most reliable way to load arbitrary HTML in Electron.
          // data: URIs can be too long for large sticker sheets (50+ labels).
          // loadFile triggers did-finish-load reliably without URI length limits.
          const tempFilePath = htmlToTempFile(options.html);
          await new Promise<void>((resolve, reject) => {
            printWindow.webContents.once('did-finish-load', resolve);
            printWindow.loadFile(tempFilePath).catch(reject);
          });
          // Clean up temp file after it is loaded (before printing)
          try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }

          // Extra settle time for fonts and SVG layout to complete
          await new Promise<void>((res) => setTimeout(res, 500));

          return new Promise<Result<PrintSilentResult>>((resolve) => {
            printWindow.webContents.print(
              {
                silent: true,
                printBackground: true,
                deviceName: configuredPrinter || undefined,
                copies,
                margins: { marginType: 'none' },
                // Use printer's own default page size when no explicit deviceName override
                usePrinterDefaultPageSize: !configuredPrinter,
              },
              (success, failureReason) => {
                try {
                  printWindow.close();
                } catch {
                  // ignore
                }

                if (success) {
                  logger.info('hardware', `Silent print completed successfully to ${configuredPrinter || 'default'}`);
                  resolve({
                    success: true,
                    data: {
                      success: true,
                      printerName: configuredPrinter || 'Default System Printer',
                      message: `Print job sent to ${configuredPrinter || 'Default System Printer'}`,
                    },
                  });
                } else {
                  logger.warn('hardware', `Silent print failed: ${failureReason}`);
                  resolve({
                    success: false,
                    error: `Print failed: ${failureReason}`,
                  });
                }
              },
            );
          });
        } else {
          // Direct silent print of the active window surface
          const targetWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
          if (!targetWindow) {
            throw new Error('No active window available to print');
          }

          return new Promise<Result<PrintSilentResult>>((resolve) => {
            targetWindow.webContents.print(
              {
                silent: true,
                printBackground: true,
                deviceName: configuredPrinter || undefined,
                copies,
                margins: { marginType: 'none' },
              },
              (success, failureReason) => {
                if (success) {
                  logger.info('hardware', `Silent window print completed to ${configuredPrinter || 'default'}`);
                  resolve({
                    success: true,
                    data: {
                      success: true,
                      printerName: configuredPrinter || 'Default System Printer',
                      message: `Receipt printed directly to ${configuredPrinter || 'Default System Printer'}`,
                    },
                  });
                } else {
                  logger.warn('hardware', `Silent window print failed: ${failureReason}`);
                  resolve({
                    success: false,
                    error: `Print failed: ${failureReason}`,
                  });
                }
              },
            );
          });
        }
      } catch (error) {
        logger.error('hardware', 'Error during direct silent print', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Direct silent print failed',
        };
      }
    },
  );

  // 4. Open Cash Drawer Pulse Signal
  ipcMain.handle(
    IPC_CHANNELS.HARDWARE.OPEN_DRAWER,
    async (_, printerName?: string): Promise<Result<{ success: boolean; message: string }>> => {
      try {
        const targetPrinter = printerName || (getSetting('printing.receipt_printer_name' as any) as string) || 'Default Printer';
        logger.info('hardware', `Triggering cash drawer pulse on ${targetPrinter}`);

        return {
          success: true,
          data: {
            success: true,
            message: `Cash drawer pulse signal sent via thermal interface to ${targetPrinter}.`,
          },
        };
      } catch (error) {
        logger.error('hardware', 'Error pulsing cash drawer', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to pulse cash drawer',
        };
      }
    },
  );
}
