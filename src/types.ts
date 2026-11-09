/** ISO date string, YYYY-MM-DD */
export type ISODate = string;

/** One PO loaded on a sewing line (PRODUCTION PLAN tab). */
export interface PlanRow {
  id: string;
  line: number;
  buyer: string;
  category: string | null;
  style: string;
  product: string | null;
  po: string;
  combo: string | null;
  color: string | null;
  orderQty: number | null;
  planQty: number | null;
  smv: number | null;
  fob: number | null;
  cm: number | null;
  emb: string | null;
  tier: number | null;
  mp: number | null;
  wh: number | null;
  poEtd: ISODate | null;
  updEtd: ISODate | null;
  pcd: ISODate | null;
  inputDate: ISODate | null;
  psd: ISODate | null;
  running: boolean;
  ped: ISODate | null;
  packFinish: ISODate | null;
  inspection: ISODate | null;
  planEtd: ISODate | null;
  status: string;
  remarks: string | null;
  planToDate: number | null;
  sewQty: number | null;
  sewBal: number | null;
  daysInHand: number | null;
  reqPerDay: number | null;
  producedBefore: number | null;
  isSplit?: boolean;
  splitOriginalId?: string;
  splitPart?: number;
  splitTotalParts?: number;
}

/** Pieces planned for one PO on one working day. */
export interface DailyRow {
  date: ISODate;
  line: number;
  id: string;
  po: string;
  style: string;
  buyer: string;
  qty: number;
}

/** One value per line per date (MANPOWER, WORKING HOURS, NPT tabs). */
export interface CapRow {
  date: ISODate;
  line: number;
  value: number;
}

/** One buyer order (ORDER SHEET tab). */
export interface OrderRow {
  id: string;
  orderDate: ISODate | null;
  category: string | null;
  buyer: string;
  style: string;
  product: string | null;
  po: string;
  combo: string | null;
  color: string | null;
  orderQty: number;
  poEtd: ISODate | null;
  updEtd: ISODate | null;
  smv: number | null;
  fob: number | null;
  cm: number | null;
  shippedQty: number | null;
  shipBal: number | null;
  status: string;
  remarks: string | null;
}

export interface PoView {
  id: string;
  sewn: number;
  sewBal: number;
  devDays: number | null;
  planMin: number;
  fobValue: number;
  cmValue: number;
}

export interface ScopeKpi {
  pos: number;
  lines: number;
  planQty: number;
  sewn: number;
  sewBal: number;
  planMin: number;
  fobValue: number;
  cmValue: number;
  late: number;
  lastPed: ISODate | null;
}

export interface LineLoad {
  key: string;
  line: number;
  date: ISODate;
  mp: number;
  wh: number;
  nptMin: number;
  availMin: number;
  planQty: number;
  planMin: number;
  eff: number | null;
}

export interface LineSummary {
  line: number;
  pos: number;
  planQty: number;
  planMin: number;
  start: ISODate | null;
  end: ISODate | null;
  freeFrom: ISODate | null;
  eff: number | null;
}

export interface BookStatus {
  status: string;
  orders: number;
  orderQty: number;
  shipBal: number;
}

export interface Filters {
  line: string;   // 'All' or line number as text
  buyer: string;  // 'All' or buyer name
  status: string; // 'All' or present status
}

export type ColorMode = 'change' | 'style' | 'order' | 'status' | 'buyer' | 'risk' | 'capacity';
export type RunStatus = 'All' | 'Running' | 'Not started' | 'Finished';
export type ViewPreset = 'month' | 'week' | 'day';

export interface BoardState {
  view: ViewPreset | null;
  px: number;
  multi: boolean;
  q: string;
  run: RunStatus;
  color: ColorMode;
  from: ISODate | null;
  to: ISODate | null;
  todayTick: number;
}

export interface DashboardData {
  plan: PlanRow[];
  planTitle: string | null;
  daily: DailyRow[];
  manpower: CapRow[];
  hours: CapRow[];
  npt: CapRow[];
  orders: OrderRow[];
}

export type ERPNavModule =
  | 'planning-board'
  | 'orders'
  | 'upload'
  | 'line-allocation'
  | 'factories'
  | 'master-data'
  | 'reports'
  | 'audit-log';

export interface FactoryRecord {
  id: string;
  name: string;
  code: string;
  location: string;
  totalLines: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
}

export interface FacilityRecord {
  id: string;
  factoryId: string;
  factoryName: string;
  name: string;
  building: string;
  floor: string;
  linesCount: number;
}

export interface ProductionLineMaster {
  id: string;
  lineNo: number;
  name: string;
  factoryId: string;
  factoryName: string;
  facilityName: string;
  machinesCount: number;
  manpowerCount: number;
  workingHours: number;
  targetEfficiency: number; // e.g. 75 (%)
  active: boolean;
  supervisor?: string;
}

export interface BuyerMaster {
  id: string;
  name: string;
  code: string;
  country: string;
  contactEmail: string;
  paymentTerms: string;
  activeOrdersCount: number;
  status: 'Active' | 'Inactive';
}

export interface StyleMaster {
  id: string;
  styleCode: string;
  buyerName: string;
  category: string;
  smv: number;
  description: string;
  stdManpower?: number;
  targetEfficiency?: number;
  machineRequirements?: string;
  learningCurveProfile?: string;
}

export interface CategoryMaster {
  id: string;
  name: string;
  code: string;
  defaultSmv: number;
  description: string;
}

export interface MachineMaster {
  id: string;
  machineCode: string;
  type: string;
  brand: string;
  lineNo: number;
  status: 'Operational' | 'Maintenance' | 'Standby';
}

export interface UploadLogRecord {
  id: string;
  fileName: string;
  targetModule: string;
  totalRows: number;
  validRows: number;
  duplicates: number;
  uploadedAt: string;
  uploadedBy: string;
  status: 'Success' | 'Warnings' | 'Failed';
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  userRole: string;
  userName: string;
  module: string;
  action: string;
  details: string;
}

