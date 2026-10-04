export interface PrinterDeviceInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface TestPrintOptions {
  printerName?: string;
  copies?: number;
}

export interface TestPrintResult {
  success: boolean;
  printerName: string;
  message: string;
}

export interface PrintSilentOptions {
  html?: string;
  printerType?: 'receipt' | 'label';
  printerName?: string;
  copies?: number;
}

export interface PrintSilentResult {
  success: boolean;
  printerName: string;
  message: string;
}

