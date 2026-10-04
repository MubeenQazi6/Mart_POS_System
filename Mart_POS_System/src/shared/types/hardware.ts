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
