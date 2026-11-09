import { useEffect, useMemo, useState } from 'react';
import type {
  AuditLogRecord,
  BoardState,
  BuyerMaster,
  CategoryMaster,
  DailyRow,
  ERPNavModule,
  FactoryRecord,
  FacilityRecord,
  Filters,
  MachineMaster,
  OrderRow,
  PlanRow,
  ProductionLineMaster,
  StyleMaster,
  UploadLogRecord,
} from './types';
import { useDashboardData } from './hooks';
import { bookStatus, lineLoad, lineSummary, poView, scopeKpi, unplanned } from './lib/calcs';
import { Toolbar, VIEW_PX } from './components/Toolbar';
import { BoardLegend, PlanningBoard } from './components/PlanningBoard';
import { KpiTiles } from './components/Summary';
import { LineStatusTable, OrderBook, PoTable } from './components/Tables';
import { DailyChart, Heatmap } from './components/Charts';
import { DataPanel } from './components/DataPanel';
import { SplitModal } from './components/SplitModal';
import type { SplitResult } from './components/SplitModal';
import { ThemeSelector } from './components/ThemeSelector';
import type { AppTheme } from './components/ThemeSelector';

// ERP Views
import { KpiDrillDownModal } from './components/KpiDrillDownModal';
import { OrderDatabaseView } from './components/OrderDatabaseView';
import { ExcelUploadView } from './components/ExcelUploadView';
import { LineAllocationView } from './components/LineAllocationView';
import { FactoryManagementView } from './components/FactoryManagementView';
import { MasterDataView } from './components/MasterDataView';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';

const DEFAULT_FILTERS: Filters = { line: 'All', buyer: 'All', status: 'All' };
const DEFAULT_BOARD: BoardState = {
  view: 'week',
  px: VIEW_PX.week,
  multi: true,
  q: '',
  run: 'All',
  color: 'change',
  from: null,
  to: null,
  todayTick: 0,
};

const SPLITS_STORAGE_KEY = 'turag-planning-board:splits';
const CUSTOM_ORDERS_KEY = 'turag-erp:custom-orders';
const CUSTOM_LINES_KEY = 'turag-erp:custom-lines';
const AUDIT_LOGS_KEY = 'turag-erp:audit-logs';
const THEME_STORAGE_KEY = 'turag-erp:theme';

export default function App() {
  const { state, custom, replace, restore } = useDashboardData();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [board, setBoard] = useState<BoardState>(DEFAULT_BOARD);
  const [resetKey, setResetKey] = useState(0);

  // Multiple Theme Mode Selection State (Light, Dark, Navy, Emerald, Charcoal, Amber, System)
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'navy', 'emerald', 'charcoal', 'amber', 'system'].includes(stored)) {
        return stored as AppTheme;
      }
    } catch {
      /* ignore */
    }
    return 'system';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }

    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Active ERP Navigation module
  const [activeModule, setActiveModule] = useState<ERPNavModule>('planning-board');
  const [activeRole, setActiveRole] = useState<string>('Lead Planner');

  // Split management state
  const [splitCard, setSplitCard] = useState<PlanRow | null>(null);
  const [activeSplits, setActiveSplits] = useState<Record<string, { orig: PlanRow; result: SplitResult }>>(() => {
    try {
      const stored = localStorage.getItem(SPLITS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // KPI Drill Down modal
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    records: PlanRow[];
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    records: [],
  });

  // Custom User-Created Orders
  const [customOrders, setCustomOrders] = useState<OrderRow[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(() => {
    try {
      const stored = localStorage.getItem(AUDIT_LOGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore */
    }
    return [
      {
        id: 'aud_1',
        timestamp: new Date().toLocaleString(),
        userRole: 'Lead Planner',
        userName: 'Planner Admin',
        module: 'Planning Board',
        action: 'System Initialized',
        details: 'Centralized Turag Garments Planning and ERP workspace loaded.',
      },
    ];
  });

  const addAuditLog = (module: string, action: string, details: string) => {
    const newLog: AuditLogRecord = {
      id: `aud_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      userRole: activeRole,
      userName: `${activeRole} User`,
      module,
      action,
      details,
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 99)];
      try {
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  // Upload History Logs
  const [uploadHistory, setUploadHistory] = useState<UploadLogRecord[]>([
    {
      id: 'upl_1',
      fileName: 'Production_Plan_Nov2026.xlsx',
      targetModule: 'Production Plan',
      totalRows: 42,
      validRows: 42,
      duplicates: 0,
      uploadedAt: new Date().toLocaleDateString(),
      uploadedBy: 'Lead Planner',
      status: 'Success',
    },
    {
      id: 'upl_2',
      fileName: 'Order_Sheet_Master.xlsx',
      targetModule: 'Order Database',
      totalRows: 65,
      validRows: 65,
      duplicates: 0,
      uploadedAt: new Date().toLocaleDateString(),
      uploadedBy: 'Merchandiser',
      status: 'Success',
    },
  ]);

  // Master Data: Factories
  const [factories, setFactories] = useState<FactoryRecord[]>([
    {
      id: 'fact_1',
      name: 'Turag Garments & Hosiery Mills Unit-1',
      code: 'TG-U1',
      location: 'Chowdhurybari, Gazipur, Bangladesh',
      totalLines: 15,
      status: 'Active',
    },
    {
      id: 'fact_2',
      name: 'Turaag Active Lifestyle Hub Unit-2',
      code: 'TG-U2',
      location: 'Ashulia Industrial Zone, Dhaka',
      totalLines: 10,
      status: 'Active',
    },
  ]);

  // Master Data: Facilities
  const [facilities, setFacilities] = useState<FacilityRecord[]>([
    {
      id: 'fac_1',
      factoryId: 'fact_1',
      factoryName: 'Turag Garments & Hosiery Mills Unit-1',
      name: 'Building A - Sewing Floor 1',
      building: 'Building A',
      floor: 'Floor 1',
      linesCount: 8,
    },
    {
      id: 'fac_2',
      factoryId: 'fact_1',
      factoryName: 'Turag Garments & Hosiery Mills Unit-1',
      name: 'Building A - Sewing Floor 2',
      building: 'Building A',
      floor: 'Floor 2',
      linesCount: 7,
    },
    {
      id: 'fac_3',
      factoryId: 'fact_2',
      factoryName: 'Turaag Active Lifestyle Hub Unit-2',
      name: 'Activewear Technical Wing',
      building: 'North Wing',
      floor: 'Ground Floor',
      linesCount: 6,
    },
  ]);

  // Master Data: Production Lines
  const [productionLines, setProductionLines] = useState<ProductionLineMaster[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_LINES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore */
    }
    // Default 15 production lines
    return Array.from({ length: 15 }, (_, i) => ({
      id: `line_master_${i + 1}`,
      lineNo: i + 1,
      name: `Sewing Line ${i + 1}`,
      factoryId: 'fact_1',
      factoryName: 'Turag Garments & Hosiery Mills Unit-1',
      facilityName: i < 8 ? 'Building A - Sewing Floor 1' : 'Building A - Sewing Floor 2',
      machinesCount: 32 + (i % 5),
      manpowerCount: 38 + (i % 6),
      workingHours: 8,
      targetEfficiency: 70 + (i % 10),
      active: true,
      supervisor: `Supervisor Line ${i + 1}`,
    }));
  });

  // Master Data: Buyers
  const [masterBuyers, setMasterBuyers] = useState<BuyerMaster[]>([
    { id: 'b_1', name: 'ABC', code: 'ABC', country: 'USA', contactEmail: 'supply@abc.com', paymentTerms: 'LC 60 Days', activeOrdersCount: 8, status: 'Active' },
    { id: 'b_2', name: 'Next', code: 'NXT', country: 'UK', contactEmail: 'sourcing@next.co.uk', paymentTerms: 'LC 90 Days', activeOrdersCount: 6, status: 'Active' },
    { id: 'b_3', name: 'Zara', code: 'ZRA', country: 'Spain', contactEmail: 'inditex@zara.com', paymentTerms: 'TT 30 Days', activeOrdersCount: 5, status: 'Active' },
    { id: 'b_4', name: 'Target', code: 'TGT', country: 'USA', contactEmail: 'vendor@target.com', paymentTerms: 'LC 60 Days', activeOrdersCount: 4, status: 'Active' },
    { id: 'b_5', name: 'H&M', code: 'HNM', country: 'Sweden', contactEmail: 'orders@hm.com', paymentTerms: 'LC 90 Days', activeOrdersCount: 7, status: 'Active' },
  ]);

  // Master Data: Styles
  const [masterStyles, setMasterStyles] = useState<StyleMaster[]>([
    { id: 'st_1', styleCode: '16', buyerName: 'ABC', category: 'Knit Tops', smv: 11.2, description: 'Basic Crewneck Short Sleeve Tee' },
    { id: 'st_2', styleCode: 'TR-102', buyerName: 'Next', category: 'Polo Shirt', smv: 14.5, description: 'Pique Collar Solid Polo Shirt' },
    { id: 'st_3', styleCode: 'ZR-884', buyerName: 'Zara', category: 'Hoodies', smv: 18.0, description: 'French Terry Relaxed Fit Hoodie' },
    { id: 'st_4', styleCode: 'AW-09', buyerName: 'Turaag Active', category: 'Activewear', smv: 13.0, description: 'Performance Stretch Training Top' },
  ]);

  // Master Data: Product Categories
  const [masterCategories, setMasterCategories] = useState<CategoryMaster[]>([
    { id: 'c_1', name: 'Knit Tops', code: 'KT', defaultSmv: 12.0, description: 'T-Shirts, Tanks, Tops' },
    { id: 'c_2', name: 'Polo Shirts', code: 'PL', defaultSmv: 15.0, description: 'Knitted and Pique Polos' },
    { id: 'c_3', name: 'Hoodies & Sweats', code: 'HD', defaultSmv: 18.5, description: 'Fleece, Terry, Pullovers' },
    { id: 'c_4', name: 'Activewear & Leggings', code: 'AW', defaultSmv: 13.5, description: 'Technical Sports & Gym Wear' },
  ]);

  // Master Data: Sewing Machines
  const [masterMachines, setMasterMachines] = useState<MachineMaster[]>([
    { id: 'm_1', machineCode: 'SN-101-JK', type: 'Single Needle Lockstitch', brand: 'Juki', lineNo: 1, status: 'Operational' },
    { id: 'm_2', machineCode: 'OL-204-PG', type: 'Overlock 4-Thread', brand: 'Pegasus', lineNo: 1, status: 'Operational' },
    { id: 'm_3', machineCode: 'FL-305-BR', type: 'Flatlock / Interlock', brand: 'Brother', lineNo: 1, status: 'Operational' },
    { id: 'm_4', machineCode: 'BT-401-JK', type: 'Bar Tack Machine', brand: 'Juki', lineNo: 2, status: 'Operational' },
    { id: 'm_5', machineCode: 'SN-102-JK', type: 'Single Needle Lockstitch', brand: 'Juki', lineNo: 2, status: 'Operational' },
  ]);

  const d = state.data;

  // Combine initial orders from dataset with any user-created orders
  const allOrders = useMemo(() => {
    if (!d) return customOrders;
    return [...customOrders, ...d.orders];
  }, [d, customOrders]);

  // Derive effective plan and daily output with active splits applied
  const { effectivePlan, effectiveDaily } = useMemo(() => {
    if (!d) return { effectivePlan: [] as PlanRow[], effectiveDaily: [] as DailyRow[] };
    const splitEntries = Object.values(activeSplits);
    if (!splitEntries.length) return { effectivePlan: d.plan, effectiveDaily: d.daily };

    let plan = [...d.plan];
    let daily = [...d.daily];

    for (const { result } of splitEntries) {
      const idx = plan.findIndex((r) => r.id === result.origId);
      if (idx === -1) continue;

      const base = plan[idx];
      const updatedOrig: PlanRow = {
        ...base,
        planQty: result.origQty,
        psd: result.origPsd,
        ped: result.origPed,
        remarks: result.origRemarks || base.remarks,
        isSplit: true,
        splitOriginalId: base.splitOriginalId ?? base.id,
        splitPart: 1,
        splitTotalParts: 2,
      };

      const newId = `${result.origId}_split`;
      const updatedNew: PlanRow = {
        ...base,
        id: newId,
        line: result.newLine,
        planQty: result.newQty,
        psd: result.newPsd,
        ped: result.newPed,
        remarks: result.newRemarks || `Split from Line ${base.line}`,
        isSplit: true,
        splitOriginalId: base.splitOriginalId ?? base.id,
        splitPart: 2,
        splitTotalParts: 2,
      };

      plan[idx] = updatedOrig;
      plan.push(updatedNew);

      // Proportionally scale and allocate daily output
      const origPlanQty = base.planQty || 1;
      const ratioOrig = result.origQty / origPlanQty;
      const ratioNew = result.newQty / origPlanQty;

      const newDailyRows: DailyRow[] = [];
      daily = daily.map((dr) => {
        if (dr.id === result.origId) {
          const q1 = Math.round(dr.qty * ratioOrig);
          const q2 = dr.qty - q1;
          if (q2 > 0) {
            newDailyRows.push({
              ...dr,
              id: newId,
              line: result.newLine,
              qty: q2,
            });
          }
          return { ...dr, qty: q1 };
        }
        return dr;
      });
      daily = daily.concat(newDailyRows);
    }

    return { effectivePlan: plan, effectiveDaily: daily };
  }, [d, activeSplits]);

  // Derived dashboard metrics (Centralized calculation engine)
  const derived = useMemo(() => {
    if (!d || !effectivePlan.length) return null;
    const pv = poView(effectivePlan);
    const load = lineLoad(effectivePlan, effectiveDaily, d.manpower, d.hours, d.npt);
    const summary = lineSummary(effectivePlan, load);
    const calendar = [...new Set(d.manpower.map((r) => r.date))].sort();

    // Unified lines: existing lines + lines configured in master + any dynamically added line
    const configuredLineNumbers = productionLines.map((l) => l.lineNo);
    const planLineNumbers = effectivePlan.map((r) => r.line);
    const allLines = [...new Set([...configuredLineNumbers, ...planLineNumbers])].sort((a, b) => a - b);

    return {
      pv,
      load,
      summary,
      calendar,
      lines: allLines,
      book: bookStatus(allOrders),
      open: unplanned(allOrders, effectivePlan),
      buyers: [...new Set(effectivePlan.map((r) => r.buyer))].sort(),
      statuses: [...new Set(effectivePlan.map((r) => r.status))].sort(),
    };
  }, [d, effectivePlan, effectiveDaily, productionLines, allOrders]);

  const kpi = useMemo(
    () => (d && derived ? scopeKpi(effectivePlan, derived.pv, filters) : null),
    [d, derived, effectivePlan, filters]
  );

  // Split handlers
  const handleSplitConfirm = (result: SplitResult) => {
    if (!d) return;
    const orig = d.plan.find((r) => r.id === result.origId) || effectivePlan.find((r) => r.id === result.origId);
    if (!orig) return;

    const next = {
      ...activeSplits,
      [result.origId]: { orig, result },
    };
    setActiveSplits(next);
    addAuditLog(
      'Planning Board',
      'Split Plan Card',
      `PO ${orig.po} split between Line ${orig.line} (${result.origQty} pcs) and Line ${result.newLine} (${result.newQty} pcs)`
    );
    try {
      localStorage.setItem(SPLITS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable */
    }
  };

  const handleRevertSplit = (cardId: string) => {
    const key = Object.keys(activeSplits).find(
      (k) => k === cardId || `${k}_split` === cardId || activeSplits[k].result.origId === cardId
    );
    if (!key) return;
    const target = activeSplits[key];
    const next = { ...activeSplits };
    delete next[key];
    setActiveSplits(next);
    addAuditLog('Planning Board', 'Revert Split', `Reverted split for PO ${target.orig.po} back to Line ${target.orig.line}`);
    try {
      localStorage.setItem(SPLITS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleResetAllSplits = () => {
    setActiveSplits({});
    addAuditLog('Planning Board', 'Reset All Splits', 'All order splits restored to original single allocations.');
    try {
      localStorage.removeItem(SPLITS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  // KPI Drill Down Handler
  const handleKpiDrillDown = (kpiKey: string, title: string, subtitle: string) => {
    if (!derived) return;
    let records = effectivePlan;
    if (kpiKey === 'late') {
      records = effectivePlan.filter((r) => {
        const v = derived.pv.get(r.id);
        return (v?.devDays ?? 0) > 0;
      });
    }
    setDrillDownModal({
      isOpen: true,
      title,
      subtitle,
      records,
    });
    addAuditLog('Dashboard', 'Drill-Down Query', `Inspected source records for ${title}`);
  };

  // Order Database Handlers
  const handleAddOrder = (order: OrderRow) => {
    setCustomOrders((prev) => {
      const updated = [order, ...prev];
      try {
        localStorage.setItem(CUSTOM_ORDERS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    addAuditLog('Order Database', 'Create Order', `Added new order: PO ${order.po} (${order.buyer}, ${order.orderQty} pcs)`);
  };

  const handleImportOrders = (newOrders: OrderRow[]) => {
    setCustomOrders((prev) => {
      const updated = [...newOrders, ...prev];
      try {
        localStorage.setItem(CUSTOM_ORDERS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    addAuditLog('Data Upload', 'Import Orders', `Batch imported ${newOrders.length} orders via Excel.`);
  };

  const handleImportPlan = (newPlan: PlanRow[]) => {
    addAuditLog('Data Upload', 'Import Plan', `Imported ${newPlan.length} line plan rows via Excel.`);
  };

  // Line Allocation Handlers
  const handleAssignOrderToLine = (
    order: OrderRow,
    line: number,
    psd: string,
    ped: string,
    qty: number
  ) => {
    const newPlanRow: PlanRow = {
      id: `plan_${Date.now()}`,
      line,
      po: order.po,
      buyer: order.buyer,
      style: order.style,
      category: order.category,
      product: order.product,
      combo: order.combo,
      color: order.color,
      orderQty: order.orderQty,
      planQty: qty,
      smv: order.smv,
      fob: order.fob,
      cm: order.cm,
      emb: null,
      tier: null,
      mp: 40,
      wh: 8,
      poEtd: order.poEtd,
      updEtd: order.updEtd,
      pcd: null,
      inputDate: null,
      psd,
      running: false,
      ped,
      packFinish: null,
      inspection: null,
      planEtd: order.updEtd || order.poEtd,
      status: 'Plan',
      remarks: 'Assigned via Allocation Workspace',
      planToDate: 0,
      sewQty: 0,
      sewBal: qty,
      daysInHand: null,
      reqPerDay: Math.round(qty / 5),
      producedBefore: null,
    };

    if (d) {
      d.plan = [newPlanRow, ...d.plan];
    }
    addAuditLog(
      'Line Allocation',
      'Assign Order',
      `Assigned PO ${order.po} (${qty} pcs) to Line ${line} from ${psd} to ${ped}`
    );
  };

  const handleRemovePlanCard = (cardId: string) => {
    if (d) {
      d.plan = d.plan.filter((p) => p.id !== cardId);
      addAuditLog('Line Allocation', 'Remove Plan', `Removed allocation record ${cardId}`);
    }
  };

  // Factory & Line Master Handlers
  const handleAddProductionLine = (line: ProductionLineMaster) => {
    setProductionLines((prev) => {
      const updated = [...prev, line].sort((a, b) => a.lineNo - b.lineNo);
      try {
        localStorage.setItem(CUSTOM_LINES_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    addAuditLog(
      'Factory Management',
      'Create Line',
      `Registered new Sewing Line ${line.lineNo} (${line.factoryName}, ${line.facilityName})`
    );
  };

  const handleDeleteProductionLine = (id: string) => {
    setProductionLines((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      try {
        localStorage.setItem(CUSTOM_LINES_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    addAuditLog('Factory Management', 'Delete Line', `Decommissioned production line record ${id}`);
  };

  const handleAddFactory = (f: FactoryRecord) => {
    setFactories((prev) => [...prev, f]);
    addAuditLog('Factory Management', 'Create Factory', `Added manufacturing plant: ${f.name} (${f.code})`);
  };

  const handleAddFacility = (f: FacilityRecord) => {
    setFacilities((prev) => [...prev, f]);
    addAuditLog('Factory Management', 'Create Facility', `Added facility floor: ${f.name} in ${f.factoryName}`);
  };

  // Master Data Handlers
  const handleAddBuyer = (b: BuyerMaster) => {
    setMasterBuyers((prev) => [...prev, b]);
    addAuditLog('Master Data', 'Add Buyer', `Registered buyer account: ${b.name} (${b.country})`);
  };
  const handleDeleteBuyer = (id: string) => {
    setMasterBuyers((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddStyle = (s: StyleMaster) => {
    setMasterStyles((prev) => [...prev, s]);
    addAuditLog('Master Data', 'Add Style', `Registered style ${s.styleCode} (SMV: ${s.smv}) for ${s.buyerName}`);
  };
  const handleDeleteStyle = (id: string) => {
    setMasterStyles((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddCategory = (c: CategoryMaster) => {
    setMasterCategories((prev) => [...prev, c]);
    addAuditLog('Master Data', 'Add Category', `Created category ${c.name} (${c.code})`);
  };
  const handleDeleteCategory = (id: string) => {
    setMasterCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddMachine = (m: MachineMaster) => {
    setMasterMachines((prev) => [...prev, m]);
    addAuditLog('Master Data', 'Add Machine', `Registered sewing machine ${m.machineCode} on Line ${m.lineNo}`);
  };
  const handleDeleteMachine = (id: string) => {
    setMasterMachines((prev) => prev.filter((m) => m.id !== id));
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setBoard({
      ...DEFAULT_BOARD,
      px: board.px,
      view: board.view,
      multi: board.multi,
      color: board.color,
      todayTick: board.todayTick + 1,
    });
    setResetKey((k) => k + 1);
  };

  return (
    <div className="sl">
      {/* Centralized ERP Top Header & Navigation Bar */}
      <header id="overview" className="flex flex-col gap-3 pb-2 border-b border-[var(--color-border-line)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5 flex-wrap">
            <img
              src={`${import.meta.env.BASE_URL}assets/aistudio/image_bfec73ab.png`}
              alt="TURAG"
              className="h-8 md:h-9 w-auto object-contain transition-all"
            />
            <div className="h-6 w-px bg-[var(--color-border-line)] hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Turag Planning Board</h1>
            </div>
          </div>

          {/* Header Controls: Theme Mode Selection & User Role Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Multiple Theme Mode Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-fg-muted)] hidden md:inline">Theme:</span>
              <ThemeSelector
                currentTheme={theme}
                onThemeChange={(newTheme) => {
                  setTheme(newTheme);
                  addAuditLog('System', 'Switch Theme', `Switched theme mode to ${newTheme}`);
                }}
              />
            </div>
          </div>
        </div>

        {/* Centralized Platform Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {[
            { id: 'planning-board', label: '📊 Planning Board', badge: null },
            { id: 'orders', label: '📋 Order Database', badge: `${allOrders.length}` },
            { id: 'upload', label: '📥 Excel Upload', badge: null },
            { id: 'line-allocation', label: '🔄 Line Allocation', badge: `${derived?.lines.length ?? 0} Lines` },
            { id: 'factories', label: '🏭 Factory & Facilities', badge: `${factories.length}` },
            { id: 'master-data', label: '🗃️ Master Data', badge: null },
            { id: 'reports', label: '📈 Reports & Export', badge: null },
            { id: 'audit-log', label: '📝 Audit Log', badge: `${auditLogs.length}` },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveModule(m.id as ERPNavModule)}
              className={`px-3 py-1.5 font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModule === m.id
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)] shadow-xs'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-panel)]'
              }`}
            >
              <span>{m.label}</span>
              {m.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeModule === m.id
                      ? 'bg-[var(--color-bg)]/20 text-[var(--color-bg)]'
                      : 'bg-[var(--color-panel)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)]'
                  }`}
                >
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* MODULE 1: EXISTING PLANNING DASHBOARD (100% Preserved) */}
      {activeModule === 'planning-board' && d && derived && kpi && (
        <>
          {Object.keys(activeSplits).length > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[var(--color-panel)] border border-[var(--series-4)]/40 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--series-4)] animate-pulse" />
                <span className="font-bold">
                  {Object.keys(activeSplits).length} order(s) currently split across lines.
                </span>
                <span className="text-[var(--color-fg-muted)] hidden sm:inline">
                  Click any plan card to view or adjust allocation.
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetAllSplits}
                className="px-2.5 py-1 text-xs font-semibold rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] hover:bg-[var(--color-bad)]/10 hover:text-[var(--color-bad)] hover:border-[var(--color-bad)]/40 transition-colors cursor-pointer"
              >
                Reset All Splits
              </button>
            </div>
          )}

          <section className="sl-sec" id="planning-board">
            <Toolbar
              filters={filters}
              setFilters={setFilters}
              board={board}
              setBoard={setBoard}
              lines={[...new Set(effectivePlan.map((r) => String(r.line)))].sort((a, b) => Number(a) - Number(b))}
              buyers={derived.buyers}
              statuses={derived.statuses}
              calMin={derived.calendar[0]}
              calMax={derived.calendar[derived.calendar.length - 1]}
              onReset={reset}
              resetKey={resetKey}
            />
            <BoardLegend plan={effectivePlan} mode={board.color} />
            <PlanningBoard
              plan={effectivePlan}
              pv={derived.pv}
              calendar={derived.calendar}
              lines={derived.lines}
              filters={filters}
              board={board}
              onCardClick={(card) => setSplitCard(card)}
              onOpenLineAllocation={() => {
                setActiveModule('line-allocation');
                addAuditLog('Planning Board', 'Open Line Allocation', 'Opened Line Allocation workspace from board header button');
              }}
            />
          </section>

          <KpiTiles k={kpi} onDrillDown={handleKpiDrillDown} />

          <section className="sl-sec" id="line-status">
            <h2>Line status</h2>
            <LineStatusTable rows={derived.summary} filters={filters} />
          </section>

          <section className="sl-sec" id="daily-output">
            <h2>Daily planned output</h2>
            <DailyChart daily={effectiveDaily} plan={effectivePlan} filters={filters} />
          </section>

          <section className="sl-sec" id="efficiency">
            <h2>Planned efficiency by line and day</h2>
            <Heatmap load={derived.load} filters={filters} />
          </section>

          <section className="sl-sec" id="po-plan">
            <h2>PO plan</h2>
            <PoTable plan={effectivePlan} pv={derived.pv} filters={filters} />
          </section>

          <section className="sl-sec" id="order-book">
            <h2>Order book</h2>
            <OrderBook book={derived.book} open={derived.open} />
          </section>

          <DataPanel
            custom={custom}
            replace={replace}
            restore={restore}
            error={null}
          />

          <details id="definitions">
            <summary>Definitions</summary>
            <dl>
              <dt>PSD / PED</dt>
              <dd>Planned sewing start and end dates on the line, from the PRODUCTION PLAN tab. A PO marked "Running" starts on its first planned day.</dd>
              <dt>Working days</dt>
              <dd>Dates listed in the MANPOWER tab, with holidays already removed.</dd>
              <dt>Produce minutes</dt>
              <dd>Line plan quantity × SMV per piece.</dd>
              <dt>Sewn / balance</dt>
              <dd>Sewn is Sewing Qty, or else "Production up to …" from the plan tab. Balance is line plan quantity minus sewn.</dd>
              <dt>Available minutes</dt>
              <dd>Manpower × working hours × 60, less NPT minutes per operator.</dd>
              <dt>Planned efficiency</dt>
              <dd>Produce minutes planned for a line on a day ÷ that day's available minutes.</dd>
              <dt>Days late</dt>
              <dd>Plan ETD minus updated ETD, in calendar days. Above zero means the plan ships after the buyer's date.</dd>
            </dl>
          </details>
        </>
      )}

      {/* MODULE 2: ORDER DATABASE */}
      {activeModule === 'orders' && (
        <OrderDatabaseView
          orders={allOrders}
          plan={effectivePlan}
          onAddOrder={handleAddOrder}
          onUpdateOrder={() => {}}
          onAssignToLine={(ord) => {
            setActiveModule('line-allocation');
          }}
        />
      )}

      {/* MODULE 3: EXCEL UPLOAD */}
      {activeModule === 'upload' && (
        <ExcelUploadView
          existingOrders={allOrders}
          existingPlan={effectivePlan}
          onImportOrders={handleImportOrders}
          onImportPlan={handleImportPlan}
          uploadHistory={uploadHistory}
          onAddUploadLog={(log) => setUploadHistory((prev) => [log, ...prev])}
          activeRole={activeRole}
        />
      )}

      {/* MODULE 4: LINE ALLOCATION */}
      {activeModule === 'line-allocation' && derived && (
        <LineAllocationView
          orders={allOrders}
          plan={effectivePlan}
          lines={derived.lines}
          onAssignOrderToLine={handleAssignOrderToLine}
          onRemovePlanCard={handleRemovePlanCard}
          onTriggerSplit={(r) => setSplitCard(r)}
        />
      )}

      {/* MODULE 5: FACTORY & FACILITIES */}
      {activeModule === 'factories' && (
        <FactoryManagementView
          factories={factories}
          facilities={facilities}
          productionLines={productionLines}
          onAddFactory={handleAddFactory}
          onAddFacility={handleAddFacility}
          onAddProductionLine={handleAddProductionLine}
          onUpdateProductionLine={() => {}}
          onDeleteProductionLine={handleDeleteProductionLine}
        />
      )}

      {/* MODULE 6: MASTER DATA */}
      {activeModule === 'master-data' && derived && (
        <MasterDataView
          buyers={masterBuyers}
          styles={masterStyles}
          categories={masterCategories}
          machines={masterMachines}
          calendar={derived.calendar}
          onAddBuyer={handleAddBuyer}
          onAddStyle={handleAddStyle}
          onAddCategory={handleAddCategory}
          onAddMachine={handleAddMachine}
          onDeleteBuyer={handleDeleteBuyer}
          onDeleteStyle={handleDeleteStyle}
          onDeleteCategory={handleDeleteCategory}
          onDeleteMachine={handleDeleteMachine}
        />
      )}

      {/* MODULE 7: REPORTS & EXPORT */}
      {activeModule === 'reports' && derived && (
        <ReportsView
          orders={allOrders}
          plan={effectivePlan}
          summary={derived.summary}
          load={derived.load}
        />
      )}

      {/* MODULE 8: AUDIT LOG */}
      {activeModule === 'audit-log' && (
        <AuditLogView logs={auditLogs} activeRole={activeRole} />
      )}

      {/* Split Modal Dialog */}
      {derived && (
        <SplitModal
          card={splitCard}
          allLines={derived.lines}
          calendar={derived.calendar}
          onClose={() => setSplitCard(null)}
          onConfirm={handleSplitConfirm}
          onRevert={handleRevertSplit}
        />
      )}

      {/* Interactive KPI & Figure Drill Down Modal */}
      <KpiDrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal((prev) => ({ ...prev, isOpen: false }))}
        title={drillDownModal.title}
        subtitle={drillDownModal.subtitle}
        records={drillDownModal.records}
        filterContext={`Line: ${filters.line} · Buyer: ${filters.buyer} · Status: ${filters.status}`}
      />
    </div>
  );
}
