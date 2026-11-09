import { useState } from 'react';
import type { OrderRow, PlanRow, UploadLogRecord } from '../types';
import * as XLSX from 'xlsx';

interface ExcelUploadViewProps {
  existingOrders: OrderRow[];
  existingPlan: PlanRow[];
  onImportOrders: (newOrders: OrderRow[]) => void;
  onImportPlan: (newPlan: PlanRow[]) => void;
  uploadHistory: UploadLogRecord[];
  onAddUploadLog: (log: UploadLogRecord) => void;
  activeRole: string;
}

interface PreviewRow {
  index: number;
  data: Record<string, any>;
  isValid: boolean;
  isDuplicate: boolean;
  validationError?: string;
  selected: boolean;
}

export function ExcelUploadView({
  existingOrders,
  existingPlan,
  onImportOrders,
  onImportPlan,
  uploadHistory,
  onAddUploadLog,
  activeRole,
}: ExcelUploadViewProps) {
  const [targetModule, setTargetModule] = useState<'orders' | 'plan'>('orders');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const existingPoSet = new Set(
    targetModule === 'orders'
      ? existingOrders.map((o) => o.po.trim().toLowerCase())
      : existingPlan.map((p) => p.po.trim().toLowerCase())
  );

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsProcessing(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson.length) {
          alert('Uploaded file contains no data rows.');
          setIsProcessing(false);
          return;
        }

        const rawHeaders = Object.keys(rawJson[0]);
        setHeaders(rawHeaders);

        const rows: PreviewRow[] = rawJson.map((row, idx) => {
          const po = String(row['PO'] || row['PO Number'] || row['po'] || row['PO #'] || '').trim();
          const buyer = String(row['Buyer'] || row['BUYER'] || row['buyer'] || '').trim();
          const style = String(row['Style'] || row['STYLE'] || row['style'] || '').trim();
          const qty = Number(row['Order Qty'] || row['Plan Qty'] || row['Qty'] || row['Quantity'] || 0);

          let isDuplicate = false;
          let isValid = true;
          let validationError = '';

          if (!po) {
            isValid = false;
            validationError = 'Missing PO Number';
          } else if (!buyer) {
            isValid = false;
            validationError = 'Missing Buyer Name';
          } else if (!style) {
            isValid = false;
            validationError = 'Missing Style Code';
          } else if (isNaN(qty) || qty <= 0) {
            isValid = false;
            validationError = 'Invalid or zero Quantity';
          }

          if (po && existingPoSet.has(po.toLowerCase())) {
            isDuplicate = true;
          }

          return {
            index: idx + 1,
            data: row,
            isValid,
            isDuplicate,
            validationError,
            selected: isValid,
          };
        });

        setPreviewRows(rows);
      } catch (err) {
        alert('Failed to read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  const toggleRowSelect = (index: number) => {
    setPreviewRows((rows) =>
      rows.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const selectAll = (select: boolean) => {
    setPreviewRows((rows) => rows.map((r) => ({ ...r, selected: select && r.isValid })));
  };

  const handleConfirmImport = () => {
    const selectedRows = previewRows.filter((r) => r.selected);
    if (!selectedRows.length) {
      alert('Please select at least one valid row to import.');
      return;
    }

    if (targetModule === 'orders') {
      const newOrders: OrderRow[] = selectedRows.map((r, i) => {
        const d = r.data;
        const po = String(d['PO'] || d['PO Number'] || d['po'] || `PO-${Date.now()}-${i}`);
        const qty = Number(d['Order Qty'] || d['Qty'] || d['Quantity'] || 1000);
        return {
          id: `imp_ord_${Date.now()}_${i}`,
          orderDate: new Date().toISOString().slice(0, 10),
          po,
          buyer: String(d['Buyer'] || d['buyer'] || 'Unspecified'),
          style: String(d['Style'] || d['style'] || 'Standard'),
          category: String(d['Category'] || 'Knit'),
          product: String(d['Product'] || ''),
          combo: null,
          color: String(d['Color'] || ''),
          orderQty: qty,
          poEtd: d['PO ETD'] ? String(d['PO ETD']).slice(0, 10) : null,
          updEtd: d['Updated ETD'] ? String(d['Updated ETD']).slice(0, 10) : null,
          smv: Number(d['SMV'] || 12),
          fob: Number(d['FOB'] || 5),
          cm: Number(d['CM'] || 1.2),
          shippedQty: 0,
          shipBal: qty,
          status: 'Planned',
          remarks: 'Imported via Excel',
        };
      });
      onImportOrders(newOrders);
    } else {
      const newPlans: PlanRow[] = selectedRows.map((r, i) => {
        const d = r.data;
        const line = Number(d['Line'] || d['Line No'] || d['line'] || 1);
        const qty = Number(d['Plan Qty'] || d['Qty'] || 1000);
        return {
          id: `imp_plan_${Date.now()}_${i}`,
          line,
          po: String(d['PO'] || d['PO Number'] || `PO-${i}`),
          buyer: String(d['Buyer'] || 'General'),
          style: String(d['Style'] || 'Item'),
          category: String(d['Category'] || ''),
          product: null,
          combo: null,
          color: null,
          orderQty: qty,
          planQty: qty,
          smv: Number(d['SMV'] || 10),
          fob: 5,
          cm: 1.2,
          emb: null,
          tier: null,
          mp: 40,
          wh: 8,
          poEtd: null,
          updEtd: null,
          pcd: null,
          inputDate: null,
          psd: d['PSD'] ? String(d['PSD']).slice(0, 10) : new Date().toISOString().slice(0, 10),
          running: false,
          ped: d['PED'] ? String(d['PED']).slice(0, 10) : new Date().toISOString().slice(0, 10),
          packFinish: null,
          inspection: null,
          planEtd: null,
          status: 'Plan',
          remarks: 'Excel Import',
          planToDate: 0,
          sewQty: 0,
          sewBal: qty,
          daysInHand: null,
          reqPerDay: null,
          producedBefore: null,
        };
      });
      onImportPlan(newPlans);
    }

    const log: UploadLogRecord = {
      id: `log_${Date.now()}`,
      fileName,
      targetModule: targetModule === 'orders' ? 'Order Database' : 'Production Plan',
      totalRows: previewRows.length,
      validRows: selectedRows.length,
      duplicates: previewRows.filter((r) => r.isDuplicate).length,
      uploadedAt: new Date().toLocaleString(),
      uploadedBy: activeRole,
      status: previewRows.some((r) => !r.isValid) ? 'Warnings' : 'Success',
    };
    onAddUploadLog(log);

    setImportStatus(`Successfully imported ${selectedRows.length} records into ${targetModule}!`);
    setPreviewRows([]);
    setFile(null);
  };

  const validCount = previewRows.filter((r) => r.isValid).length;
  const duplicateCount = previewRows.filter((r) => r.isDuplicate).length;
  const errorCount = previewRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Excel Data Upload &amp; Migration</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Import, validate, detect duplicates, and preview spreadsheet records before committing to the database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[var(--color-fg-muted)]">Target Module:</label>
          <select
            value={targetModule}
            onChange={(e) => setTargetModule(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] cursor-pointer"
          >
            <option value="orders">Order Database (Order Sheet)</option>
            <option value="plan">Production Line Plan</option>
          </select>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="p-6 rounded-xl border-2 border-dashed border-[var(--color-border-line)] bg-[var(--color-panel)]/40 hover:bg-[var(--color-panel)]/70 transition-colors text-center relative cursor-pointer">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="space-y-2 pointer-events-none">
          <div className="text-3xl">📊</div>
          <div className="text-sm font-bold">
            {file ? file.name : 'Drag & drop your Excel (.xlsx, .xls) or CSV file here'}
          </div>
          <p className="text-xs text-[var(--color-fg-muted)] max-w-md mx-auto">
            Compatible with Standard Apparel Order Sheets, Line Plans, and Google Sheets exports. Supports duplicate detection and pre-import schema verification.
          </p>
          <div className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] shadow-xs">
            Browse File
          </div>
        </div>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl bg-[var(--color-ok)]/15 border border-[var(--color-ok)]/40 text-xs font-bold text-[var(--color-ok)] flex items-center justify-between">
          <span>✓ {importStatus}</span>
          <button type="button" onClick={() => setImportStatus(null)} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Pre-import Data Preview & Validation Summary */}
      {previewRows.length > 0 && (
        <div className="space-y-3 p-4 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-bg)] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">Pre-Import Inspection ({previewRows.length} Rows)</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded bg-[var(--color-ok)]/15 text-[var(--color-ok)] font-semibold">
                  {validCount} Valid
                </span>
                {duplicateCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-semibold">
                    {duplicateCount} Duplicates
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[var(--color-bad)]/15 text-[var(--color-bad)] font-semibold">
                    {errorCount} Errors
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-line)] hover:bg-[var(--color-panel)]"
              >
                Select All Valid
              </button>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-line)] hover:bg-[var(--color-panel)]"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Import {previewRows.filter((r) => r.selected).length} Records
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] border border-[var(--color-border-line)] rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] sticky top-0 border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-2 w-10 text-center">Import</th>
                  <th className="p-2 font-semibold">Status</th>
                  {headers.slice(0, 8).map((h) => (
                    <th key={h} className="p-2 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {previewRows.map((r) => (
                  <tr
                    key={r.index}
                    className={`hover:bg-[var(--color-panel)]/50 ${
                      !r.isValid ? 'bg-[var(--color-bad)]/5' : r.isDuplicate ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        disabled={!r.isValid}
                        onChange={() => toggleRowSelect(r.index)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {!r.isValid ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-bad)]/20 text-[var(--color-bad)]">
                          Error: {r.validationError}
                        </span>
                      ) : r.isDuplicate ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500">
                          Existing PO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-ok)]/20 text-[var(--color-ok)]">
                          Ready
                        </span>
                      )}
                    </td>
                    {headers.slice(0, 8).map((h) => (
                      <td key={h} className="p-2 whitespace-nowrap max-w-[140px] truncate">
                        {String(r.data[h] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Logs History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold tracking-tight">Upload &amp; Migration History Logs</h3>
        <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
              <tr>
                <th className="p-2.5 font-semibold">Date &amp; Time</th>
                <th className="p-2.5 font-semibold">File Name</th>
                <th className="p-2.5 font-semibold">Target Module</th>
                <th className="p-2.5 font-semibold text-right">Total Rows</th>
                <th className="p-2.5 font-semibold text-right">Imported</th>
                <th className="p-2.5 font-semibold">Uploaded By</th>
                <th className="p-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {uploadHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--color-fg-muted)]">
                    No upload history records available yet.
                  </td>
                </tr>
              ) : (
                uploadHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--color-panel)]/50">
                    <td className="p-2.5 whitespace-nowrap">{log.uploadedAt}</td>
                    <td className="p-2.5 font-bold text-sky-500 whitespace-nowrap">{log.fileName}</td>
                    <td className="p-2.5 whitespace-nowrap">{log.targetModule}</td>
                    <td className="p-2.5 text-right font-medium">{log.totalRows}</td>
                    <td className="p-2.5 text-right font-bold text-[var(--color-ok)]">{log.validRows}</td>
                    <td className="p-2.5 whitespace-nowrap">{log.uploadedBy}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Success'
                            ? 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
