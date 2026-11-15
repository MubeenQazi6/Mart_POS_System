import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

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
      let format = 'CODE128';
      if (barcodeType === 'EAN13' || (barcode.length === 13 && /^\d+$/.test(barcode))) {
        format = 'EAN13';
      }

      JsBarcode(svgRef.current, barcode, {
        format,
        width: 1.3,
        height: 28,
        displayValue: true,
        fontSize: 8.5,
        font: 'Arial, sans-serif',
        fontOptions: '',
        textMargin: 1,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
      svgRef.current.setAttribute('shape-rendering', 'crispEdges');
    } catch {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: 1.2,
          height: 28,
          displayValue: true,
          fontSize: 8.5,
          font: 'Arial, sans-serif',
          fontOptions: '',
          textMargin: 1,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
        svgRef.current.setAttribute('shape-rendering', 'crispEdges');
      } catch {
        // Leave empty if completely unrenderable
      }
    }
  }, [barcode, barcodeType]);

  const displayName =
    variantName && variantName !== 'Standard' && variantName !== 'Default'
      ? `${productName} (${variantName})`
      : productName;

  const priceValue = (sellingPriceMinor / 100).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative flex flex-col justify-between items-center text-center bg-white text-black rounded-lg border border-slate-300 shadow-md p-2 w-[260px] h-[130px] overflow-hidden select-none font-sans ${className}`}
        style={{ aspectRatio: '2 / 1' }}
      >
        {/* Store Branding */}
        <div className="w-full text-[9px] font-bold uppercase tracking-wider text-black truncate leading-tight">
          {storeName}
        </div>

        {/* Product Title */}
        <div className="w-full px-1 text-[10px] font-semibold text-black truncate leading-tight">
          {displayName}
        </div>

        {/* Barcode SVG Rendering */}
        <div className="w-full flex justify-center items-center overflow-hidden my-0.5">
          {barcode ? (
            <svg ref={svgRef} className="max-w-[230px] h-[48px] w-auto" />
          ) : (
            <div className="flex h-10 w-full items-center justify-center rounded bg-slate-100 text-[10px] font-medium text-slate-400">
              No barcode assigned
            </div>
          )}
        </div>

        {/* Selling Price */}
        <div className="w-full flex items-baseline justify-center gap-1 leading-none pb-0.5">
          <span className="text-[9px] font-bold text-black uppercase">Rs.</span>
          <span className="text-sm font-bold text-black tracking-normal">
            {priceValue}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-400 tracking-wide">
        50 mm × 25 mm (BarTender Standard)
      </span>
    </div>
  );
}

