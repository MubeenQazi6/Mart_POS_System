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

export type PrintPageSize =
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'Legal'
  | 'Letter'
  | 'Tabloid'
  | { width: number; height: number };

export interface PrintSilentOptions {
  html?: string;
  printerType?: 'receipt' | 'label';
  printerName?: string;
  copies?: number;
  pageSize?: PrintPageSize;
}

export interface PrintSilentResult {
  success: boolean;
  printerName: string;
  message: string;
}

