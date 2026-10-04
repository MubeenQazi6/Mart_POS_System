import { useState, useEffect, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { useBarcodeStore } from '@renderer/stores/barcodeStore';
import { useCatalogStore } from '@renderer/stores/catalogStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { LabelPreview } from './LabelPreview';
import { Button } from '@renderer/components/ui/Button';
import { Input } from '@renderer/components/ui/Input';
import { Badge } from '@renderer/components/ui/Badge';
import { Card } from '@renderer/components/ui/Card';
import { Modal } from '@renderer/components/ui/Modal';
import { showToast } from '@renderer/components/ui/Toast';
import { formatMoneyFromMinor } from '@shared/utils/format';
import {
  Barcode as BarcodeIcon,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';
import type {
  ProductRow,
  ProductVariantRow,
  BarcodeRow,
  PrintJobRow,
} from '@shared/types/catalog';

interface SelectedVariantInfo {
  product: ProductRow;
  variant: ProductVariantRow;
  barcode: BarcodeRow | null;
}

export function BarcodeLabelsPage(): React.JSX.Element {
  const {
    printJobs,
    isLoadingJobs,
    isGeneratingBarcode,
    statusFilter,
    setStatusFilter,
    loadPrintJobs,
    createPrintJob,
    updatePrintJobStatus,
    retryPrintJob,
    clearPrintedJobs,
    generateInternalBarcode,
  } = useBarcodeStore();

  const { products, loadProducts } = useCatalogStore();
  const { settings } = useSettingsStore();
  const storeName = settings['store.name'] || 'Mart POS';

  // Search & Selection State
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVariantInfo, setSelectedVariantInfo] = useState<SelectedVariantInfo | null>(null);

  // Print Queue Form State
  const [printQuantity, setPrintQuantity] = useState('10');
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);

  // Preview Modal
  const [previewJob, setPreviewJob] = useState<PrintJobRow | null>(null);

  // Load initial data
  useEffect(() => {
    void loadPrintJobs();
    void loadProducts();
  }, [loadPrintJobs, loadProducts]);

  // Debounced product search
  useEffect(() => {
    const term = productSearch.trim();
    if (!term) {
      setSearchResults(products.slice(0, 10));
      return;
    }

    const timer = setTimeout(() => {
      void (async (): Promise<void> => {
        if (!window.martpos) return;
        setIsSearching(true);
        try {
          const res = await window.martpos.products.search({ search: term });
          if (res.success) {
            setSearchResults(res.data);
          }
        } finally {
          setIsSearching(false);
        }
      })();
    }, 250);

    return (): void => { clearTimeout(timer); };
  }, [productSearch, products]);

  // Handle selecting a variant for preview/printing
  const handleSelectVariant = useCallback(async (product: ProductRow, variant: ProductVariantRow) => {
    if (!window.martpos) return;
    try {
      const barcodeRes = await window.martpos.barcodes.list(variant.id);
      const barcodes = barcodeRes.success ? barcodeRes.data : [];
      const primaryOrFirst = barcodes.find((b) => b.is_active && b.is_primary) ||
        barcodes.find((b) => b.is_active) || null;

      setSelectedVariantInfo({
        product,
        variant,
        barcode: primaryOrFirst,
      });
    } catch {
      setSelectedVariantInfo({
        product,
        variant,
        barcode: null,
      });
    }
  }, []);

  // Handle generating internal barcode
  const handleGenerateBarcode = async (): Promise<void> => {
    if (!selectedVariantInfo) return;

    const newBarcode = await generateInternalBarcode(selectedVariantInfo.variant.id);
    if (newBarcode) {
      setSelectedVariantInfo((prev) =>
        prev
          ? {
              ...prev,
              barcode: newBarcode,
            }
          : null
      );
      void loadProducts();
    }
  };

  // Generate SVG string offline via JsBarcode
  const generateBarcodeSvgString = (barcode: string, barcodeType: string): string => {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      let format = 'CODE128';
      if (barcodeType === 'EAN13' || (barcode.length === 13 && /^\d+$/.test(barcode))) {
        format = 'EAN13';
      }
      JsBarcode(svg, barcode, {
        format,
        width: 1.4,
        height: 38,
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        fontOptions: 'bold',
        margin: 2,
        background: '#ffffff',
        lineColor: '#0f172a',
      });
      return svg.outerHTML;
    } catch {
      try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svg, barcode, {
          format: 'CODE128',
          width: 1.2,
          height: 38,
          displayValue: true,
          fontSize: 10,
          margin: 2,
        });
        return svg.outerHTML;
      } catch {
        return `<div style="font-family: monospace; font-size: 11px; padding: 6px;">${barcode}</div>`;
      }
    }
  };

  const handlePrintStickers = async (
    productName: string,
    variantName: string | undefined,
    priceMinor: number,
    barcode: string,
    barcodeType = 'EAN13',
    quantity = 1,
    existingJobId?: number,
  ): Promise<void> => {
    if (!barcode) {
      showToast('error', 'Select a variant with a valid barcode first');
      return;
    }
    const qty = Math.max(1, quantity);

    // Save/create print job record in SQLite database
    let jobId = existingJobId;
    if (!jobId && selectedVariantInfo?.barcode) {
      const created = await window.martpos?.printJobs.create({
        variant_id: selectedVariantInfo.variant.id,
        barcode_id: selectedVariantInfo.barcode.id,
        quantity: qty,
      });
      if (created?.success) {
        jobId = created.data.id;
      }
    }

    const svgHtml = generateBarcodeSvgString(barcode, barcodeType);
    const priceFormatted = formatMoneyFromMinor(priceMinor);

    // Create printable iframe for zero-popup native thermal/sticker printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${storeName} — Print Stickers (${barcode})</title>
        <style>
          @page {
            size: auto;
            margin: 4mm;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .sticker { border: 1px dotted #cbd5e1 !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 4px;
            background: #ffffff;
          }
          .sticker-sheet {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            justify-content: flex-start;
          }
          .sticker {
            width: 48mm;
            height: 30mm;
            border: 1px dashed #cbd5e1;
            padding: 2.5mm 3mm;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            page-break-inside: avoid;
            background: #ffffff;
            border-radius: 4px;
          }
          .store-brand {
            font-size: 7.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #475569;
          }
          .item-name {
            font-size: 9px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.1;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-top: 1px;
          }
          .variant-name {
            font-size: 8px;
            font-weight: 600;
            color: #2563eb;
            line-height: 1;
          }
          .barcode-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 1px 0;
          }
          .barcode-wrapper svg {
            max-width: 100%;
            height: 32px;
          }
          .price-badge {
            font-size: 11px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.2px;
          }
        </style>
      </head>
      <body>
        <div class="sticker-sheet">
          ${Array.from({ length: qty })
            .map(
              () => `
            <div class="sticker">
              <div class="store-brand">${storeName}</div>
              <div class="item-name">${productName}</div>
              ${variantName ? `<div class="variant-name">${variantName}</div>` : ''}
              <div class="barcode-wrapper">${svgHtml}</div>
              <div class="price-badge">${priceFormatted}</div>
            </div>
          `,
            )
            .join('')}
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Trigger printing
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      if (jobId) {
        void updatePrintJobStatus(jobId, 'printed');
      }
      showToast('success', `Sent ${qty} sticker label(s) to printer`);

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        void loadPrintJobs();
      }, 3000);
    }, 250);
  };

  // Handle adding to print queue
  const handleAddToQueue = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedVariantInfo || !selectedVariantInfo.barcode) {
      showToast('error', 'Select a variant with a valid barcode first');
      return;
    }

    const qty = parseInt(printQuantity, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      showToast('error', 'Quantity must be a positive whole number (e.g. 10, 50, 100)');
      return;
    }

    setIsSubmittingJob(true);
    try {
      const ok = await createPrintJob({
        variant_id: selectedVariantInfo.variant.id,
        barcode_id: selectedVariantInfo.barcode.id,
        quantity: qty,
      });

      if (ok) {
        setPrintQuantity('10');
      }
    } finally {
      setIsSubmittingJob(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarcodeIcon className="h-6 w-6 text-brand-600" />
            Barcode Management & Label Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Generate standard EAN-13 barcodes, preview retail labels, and manage printing batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => { void loadPrintJobs(); }}
            isLoading={isLoadingJobs}
          >
            Refresh Queue
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4 text-red-500" />}
            onClick={() => { void clearPrintedJobs(); }}
          >
            Clear Printed Jobs
          </Button>
        </div>
      </div>

      {/* Top Workspace Grid: Search/Select on Left, Label Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product/Variant Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-brand-600" />
                Select Product Variant
              </h2>
              {isSearching && <span className="text-xs text-slate-400">Searching...</span>}
            </div>

            <Input
              placeholder="Search by product name, SKU, or existing barcode..."
              value={productSearch}
              onChange={(e) => { setProductSearch(e.target.value); }}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            />

            {/* Results Table */}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-surface-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-surface-border text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-3 py-2">Product / Variant</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {searchResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                        No products found matching &ldquo;{productSearch}&rdquo;
                      </td>
                    </tr>
                  ) : (
                    searchResults.flatMap((prod) =>
                      (prod.variants || []).map((variant) => {
                        const isSelected =
                          selectedVariantInfo?.variant.id === variant.id;
                        return (
                          <tr
                            key={variant.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-brand-50/80 font-medium' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900">{prod.name}</div>
                              <div className="text-[11px] text-brand-600">{variant.variant_name}</div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-600">
                              {variant.sku || '—'}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">
                              {formatMoneyFromMinor(variant.selling_price_minor)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                size="sm"
                                variant={isSelected ? 'primary' : 'secondary'}
                                onClick={() => { void handleSelectVariant(prod, variant); }}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Label Preview & Queue Action (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Printer className="h-4 w-4 text-brand-600" />
              Label Preview & Queue Batch
            </h2>

            {selectedVariantInfo ? (
              <div className="space-y-4">
                {/* Visual Label Card */}
                <div className="flex justify-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <LabelPreview
                    productName={selectedVariantInfo.product.name}
                    variantName={selectedVariantInfo.variant.variant_name}
                    sellingPriceMinor={selectedVariantInfo.variant.selling_price_minor}
                    barcode={selectedVariantInfo.barcode?.barcode || ''}
                    barcodeType={selectedVariantInfo.barcode?.barcode_type || 'EAN13'}
                    storeName={storeName}
                  />
                </div>

                {/* Barcode status & generation */}
                <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Assigned Barcode:</span>
                    {selectedVariantInfo.barcode ? (
                      <span className="font-mono font-bold text-slate-900">
                        {selectedVariantInfo.barcode.barcode} ({selectedVariantInfo.barcode.barcode_type})
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold">No Barcode</span>
                    )}
                  </div>

                  {!selectedVariantInfo.barcode && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                      leftIcon={<Sparkles className="h-4 w-4" />}
                      onClick={() => { void handleGenerateBarcode(); }}
                      isLoading={isGeneratingBarcode}
                    >
                      Generate Internal EAN-13 Barcode
                    </Button>
                  )}
                </div>

                {/* Queue Batch Form */}
                <form onSubmit={(e) => { void handleAddToQueue(e); }} className="space-y-3 pt-1">
                  <div>
                    <Input
                      label="Number of Labels to Print"
                      type="number"
                      min="1"
                      step="1"
                      value={printQuantity}
                      onChange={(e) => { setPrintQuantity(e.target.value); }}
                      required
                      disabled={!selectedVariantInfo.barcode}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1"
                      disabled={!selectedVariantInfo.barcode}
                      leftIcon={<Printer className="h-4 w-4" />}
                      onClick={() => {
                        if (!selectedVariantInfo || !selectedVariantInfo.barcode) return;
                        const qty = parseInt(printQuantity, 10) || 1;
                        void handlePrintStickers(
                          selectedVariantInfo.product.name,
                          selectedVariantInfo.variant.variant_name,
                          selectedVariantInfo.variant.selling_price_minor,
                          selectedVariantInfo.barcode.barcode,
                          selectedVariantInfo.barcode.barcode_type,
                          qty,
                        );
                      }}
                    >
                      Print Stickers
                    </Button>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={!selectedVariantInfo.barcode}
                      isLoading={isSubmittingJob}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Add to Queue
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <BarcodeIcon className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium">No variant selected</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select a product variant from the list on the left to preview its retail label.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Print Queue Section */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Print Queue</h2>
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {printJobs.length}
            </span>
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
            {(['all', 'pending', 'printed', 'failed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setStatusFilter(tab); }}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Print Queue Table */}
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-surface-border text-xs text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Product / Variant</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Labels Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {printJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No print jobs in the queue
                  </td>
                </tr>
              ) : (
                printJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{job.product_name || '—'}</div>
                      <div className="text-xs text-brand-600 font-medium">{job.variant_name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                      {job.barcode || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {job.quantity} <span className="text-xs font-normal text-slate-500">stickers</span>
                    </td>
                    <td className="px-4 py-3">
                      {job.status === 'pending' && (
                        <Badge variant="warning" className="flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                      {job.status === 'printed' && (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Printed
                        </Badge>
                      )}
                      {job.status === 'failed' && (
                        <Badge variant="danger" className="flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" /> Failed
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setPreviewJob(job); }}
                        title="Preview Label"
                      >
                        Preview
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Printer className="h-3.5 w-3.5 text-brand-600" />}
                        onClick={() => {
                          void handlePrintStickers(
                            job.product_name || 'Product',
                            job.variant_name || undefined,
                            job.selling_price_minor || 0,
                            job.barcode || '',
                            job.barcode_type || 'EAN13',
                            job.quantity,
                            job.id,
                          );
                        }}
                        title="Print Stickers Now"
                      >
                        Print
                      </Button>

                      {job.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => { void updatePrintJobStatus(job.id, 'printed'); }}
                            title="Mark as Printed"
                          >
                            Mark Printed
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => { void updatePrintJobStatus(job.id, 'failed'); }}
                            title="Mark as Failed"
                          >
                            Mark Failed
                          </Button>
                        </>
                      )}

                      {job.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { void retryPrintJob(job.id); }}
                          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Job Label Preview */}
      {previewJob && (
        <Modal
          isOpen={Boolean(previewJob)}
          onClose={() => { setPreviewJob(null); }}
          title={`Label Preview — ${previewJob.product_name || ''} (${previewJob.variant_name || ''})`}
        >
          <div className="flex flex-col items-center justify-center space-y-4 py-3">
            <LabelPreview
              productName={previewJob.product_name || 'Product'}
              variantName={previewJob.variant_name || undefined}
              sellingPriceMinor={previewJob.selling_price_minor || 0}
              barcode={previewJob.barcode || ''}
              barcodeType={previewJob.barcode_type || 'EAN13'}
              storeName={storeName}
            />
            <div className="flex justify-between items-center w-full pt-3 border-t border-surface-border">
              <Button
                variant="primary"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => {
                  void handlePrintStickers(
                    previewJob.product_name || 'Product',
                    previewJob.variant_name || undefined,
                    previewJob.selling_price_minor || 0,
                    previewJob.barcode || '',
                    previewJob.barcode_type || 'EAN13',
                    previewJob.quantity,
                    previewJob.id,
                  );
                  setPreviewJob(null);
                }}
              >
                Print {previewJob.quantity} Sticker{previewJob.quantity > 1 ? 's' : ''}
              </Button>
              <Button variant="secondary" onClick={() => { setPreviewJob(null); }}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
