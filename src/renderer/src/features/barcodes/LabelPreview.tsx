import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatMoneyFromMinor } from '@shared/utils/format';

export interface LabelPreviewProps {
  productName: string;
  variantName?: string;
  sellingPriceMinor: number;
  barcode: string;
  barcodeType?: string;
  storeName?: string;
  className?: string;
}

/**
 * Reusable retail sticker preview component.
 * Decoupled from DB rows — accepts plain domain/display props.
 * Generates vector SVG barcode offline using jsbarcode.
 */
export function LabelPreview({
  productName,
  variantName,
  sellingPriceMinor,
  barcode,
  barcodeType = 'EAN13',
  storeName = 'MARTPOS',
  className = '',
}: LabelPreviewProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !barcode) return;

    try {
      // Determine format for JsBarcode
      let format = 'CODE128';
      if (barcodeType === 'EAN13' || (barcode.length === 13 && /^\d+$/.test(barcode))) {
        format = 'EAN13';
      }

      JsBarcode(svgRef.current, barcode, {
        format,
        width: 1.6,
        height: 48,
        displayValue: true,
        fontSize: 12,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 3,
        margin: 4,
        background: '#ffffff',
        lineColor: '#0f172a',
      });
    } catch {
      // Fallback to Code128 if EAN13 check digit fails in preview
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: 1.4,
          height: 48,
          displayValue: true,
          fontSize: 11,
          margin: 4,
        });
      } catch {
        // Leave empty if completely unrenderable
      }
    }
  }, [barcode, barcodeType]);

  return (
    <div
      className={`inline-block w-64 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center shadow-sm dark:border-slate-600 dark:bg-slate-100 ${className}`}
    >
      {/* Store Branding */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {storeName}
      </div>

      {/* Product Title */}
      <div className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 leading-snug">
        {productName}
      </div>

      {/* Variant / Size info */}
      {variantName && (
        <div className="mt-0.5 text-xs font-semibold text-brand-700">{variantName}</div>
      )}

      {/* Barcode SVG Rendering */}
      <div className="my-2 flex justify-center overflow-hidden rounded bg-white">
        {barcode ? (
          <svg ref={svgRef} className="max-w-full h-auto" />
        ) : (
          <div className="flex h-16 w-full items-center justify-center rounded bg-slate-50 text-xs text-slate-400">
            No barcode assigned
          </div>
        )}
      </div>

      {/* Selling Price */}
      <div className="mt-1 border-t border-slate-200 pt-1.5">
        <div className="text-base font-extrabold text-slate-900">
          {formatMoneyFromMinor(sellingPriceMinor)}
        </div>
      </div>
    </div>
  );
}
