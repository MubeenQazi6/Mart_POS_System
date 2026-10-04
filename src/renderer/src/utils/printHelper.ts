import { showToast } from '@renderer/components/ui/Toast';

export interface PrintReceiptOptions {
  title?: string;
  printerType?: 'receipt' | 'label';
  printerName?: string;
}

/**
 * Print a DOM receipt element directly and silently using Electron's thermal printing pipeline.
 * Bypasses the Windows/browser print driver dialog completely.
 * Forces solid pure-black high-contrast styling and bold weights to eliminate faint/blurry thermal outputs.
 */
export async function printReceiptElement(
  element: HTMLElement | null,
  options?: PrintReceiptOptions,
): Promise<boolean> {
  if (!element) {
    window.print();
    return true;
  }

  const innerHtml = element.innerHTML;
  const storeTitle = options?.title || 'MartPOS Receipt';

  const standaloneHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${storeTitle}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color: #000000 !important;
      border-color: #000000 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    html, body {
      margin: 0;
      padding: 4px 6px;
      width: 72mm;
      max-width: 76mm;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      -webkit-font-smoothing: none;
      text-rendering: geometricPrecision;
    }
    h1 {
      font-size: 18px !important;
      font-weight: 900 !important;
      margin: 4px 0 !important;
      letter-spacing: -0.5px !important;
      text-transform: uppercase !important;
    }
    /* Override ALL Tailwind utility classes that affect color/weight */
    p, span, div, td, th, li, a, label, strong, b, small, em {
      color: #000000 !important;
      font-weight: 700 !important;
    }
    .font-mono, .font-sans, .font-serif { font-family: 'Courier New', Courier, monospace !important; }
    .font-bold, .font-semibold, .font-medium, strong, b { font-weight: 900 !important; }
    .text-xs, .text-sm, .text-base { font-size: inherit; }
    /* Tailwind color overrides — all become solid black */
    [class*="text-zinc"], [class*="text-slate"], [class*="text-gray"],
    [class*="text-emerald"], [class*="text-rose"], [class*="text-amber"],
    [class*="text-red"], [class*="text-green"], [class*="text-blue"] {
      color: #000000 !important;
    }
    /* Tailwind bg overrides — all white */
    [class*="bg-zinc"], [class*="bg-slate"], [class*="bg-gray"],
    [class*="bg-emerald"], [class*="bg-rose"], [class*="dark:bg"] {
      background-color: #ffffff !important;
    }
    /* Borders */
    .border-dashed, .border-b, .border-t, .border, hr {
      border-color: #000000 !important;
      border-style: dashed !important;
      border-width: 1.5px !important;
      opacity: 1 !important;
    }
    /* Layout utilities */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .space-y-1 > * + *, .space-y-0\\.5 > * + *, .space-y-2 > * + * { margin-top: 4px; }
    .py-3, .py-2 { padding-top: 6px; padding-bottom: 6px; }
    .pb-2, .pb-4 { padding-bottom: 6px; }
    .pt-1, .pt-2, .pt-4 { padding-top: 4px; }
    .px-6, .p-6 { padding-left: 0; padding-right: 0; }
    .uppercase { text-transform: uppercase; }
    .tracking-tight { letter-spacing: -0.5px; }
    /* SVG icons — crisp rendering */
    svg { shape-rendering: crispEdges !important; }
    svg.lucide, svg[data-lucide] { stroke: #000000 !important; fill: none; }
    svg path { shape-rendering: crispEdges !important; }
    /* Logo image */
    img {
      filter: grayscale(100%) contrast(300%) brightness(0) !important;
      image-rendering: pixelated !important;
      max-width: 120px !important;
      display: block;
      margin: 0 auto;
    }
    /* Hide decorative UI elements */
    .no-print, .backdrop-blur-sm, .rounded-xl, .shadow-2xl { display: none !important; }
    /* Receipt-specific sizes */
    .text-\\[10px\\], .text-\\[11px\\] { font-size: 11px !important; }
    .text-\\[10px\\] { font-size: 10px !important; }
    .text-xl { font-size: 16px !important; }
    .text-base { font-size: 13px !important; }
  </style>
</head>
<body>
  ${innerHtml}
</body>
</html>
`;

  try {
    if (window.martpos?.hardware?.printSilent) {
      const res = await window.martpos.hardware.printSilent({
        html: standaloneHtml,
        printerType: options?.printerType || 'receipt',
        printerName: options?.printerName,
      });

      if (!res.success) {
        showToast('error', res.error || 'Failed to print receipt directly');
        return false;
      }
      return true;
    } else {
      window.print();
      return true;
    }
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'Printing failed');
    return false;
  }
}
