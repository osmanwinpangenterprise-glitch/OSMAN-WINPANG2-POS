export type UserRole = 'ADMINISTRATOR' | 'MANAGER' | 'CASHIER' | 'STOREKEEPER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARIES'
  | 'TRANSPORT'
  | 'MAINTENANCE'
  | 'SUPPLIES'
  | 'MARKETING'
  | 'TAXES'
  | 'OTHER';

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  employeeId?: string;
  status?: UserStatus;
  isActive?: boolean;
  pinCode?: string;
  photoURL?: string | null;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface BusinessSettings {
  businessName: string;
  shortName: string;
  businessAddress: string;
  phone: string;
  email: string;
  logoUrl?: string;
  currency: string;
  currencySymbol: string;
  taxName: string;
  taxRate: number; // e.g. 0.15 for 15%
  taxEnabled: boolean;
  receiptPrefix: string;
  invoicePrefix: string;
  lowStockThresholdDefault: number;
  maxCashierDiscountPercent: number;
  maxManagerDiscountPercent: number;
  receiptFooter: string;
  allowNegativeStock: boolean;
  updatedAt: string;
}

export interface Category {
  categoryId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  productId: string;
  barcode: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  unit: string; // 'PCS' | 'BOX' | 'KG' | 'LITRE' | 'PACK' | 'BAG'
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  currentStock: number;
  reorderLevel: number;
  supplierId?: string;
  supplierName?: string;
  taxRate: number;
  taxable: boolean;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type CustomerType = 'WALK_IN' | 'REGULAR' | 'WHOLESALE' | 'CREDIT';

export interface Customer {
  customerId: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  customerType: CustomerType;
  creditLimit: number;
  balance: number; // Debt owed to store in GHS
  totalPurchases: number;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  supplierId: string;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  balance: number; // Amount store owes supplier in GHS
  totalPurchased: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'SPLIT';

export interface CartItem {
  productId: string;
  barcode: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number; // Snapshot of cost
  unitPrice: number; // Selling price
  discount: number; // Line discount amount in GHS
  discountPercent?: number;
  taxRate: number;
  taxable: boolean;
  subtotal: number; // (unitPrice * quantity) - discount
  taxAmount: number;
  total: number;
}

export interface SaleItem {
  itemId: string;
  productId: string;
  barcode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  profit: number; // total - (unitCost * quantity) - tax
}

export interface Sale {
  saleId: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  cashierId: string;
  cashierName: string;
  sessionId?: string;
  subtotal: number;
  discount: number;
  discountType: 'PERCENT' | 'FIXED';
  tax: number;
  total: number;
  costTotal: number;
  profit: number;
  amountPaid: number;
  change: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  mobileMoneyProvider?: 'MTN' | 'TELECEL' | 'AT';
  status: 'ACTIVE' | 'VOID' | 'REFUNDED';
  notes?: string;
  items?: SaleItem[];
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  itemId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
}

export interface Purchase {
  purchaseId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentMethod: PaymentMethod;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  items?: PurchaseItem[];
  receivedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  expenseId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
  sessionId?: string;
  recordedBy: string;
  recordedByName: string;
  status: 'ACTIVE' | 'VOID';
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'REFUND' | 'OPENING_STOCK';

export interface StockMovement {
  movementId: string;
  productId: string;
  barcode: string;
  productName: string;
  type: StockMovementType;
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceId: string;
  referenceType: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'REFUND';
  reason: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface Payment {
  paymentId: string;
  referenceId: string;
  referenceType: 'CUSTOMER_CREDIT_SETTLEMENT' | 'SUPPLIER_PAYMENT' | 'SALE_DIRECT';
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

export interface CashSession {
  sessionId: string;
  userId: string;
  userName: string;
  openingCash: number;
  openingTime: string;
  cashSales: number;
  cashReceived: number;
  cashExpenses: number;
  cashWithdrawals: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number; // actualCash - expectedCash
  closingTime?: string;
  closingNotes?: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export interface HeldSale {
  heldSaleId: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  status: 'HELD' | 'RETRIEVED' | 'DISCARDED';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  logId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: 'AUTH' | 'INVENTORY' | 'POS' | 'SALES' | 'PURCHASES' | 'CUSTOMERS' | 'SUPPLIERS' | 'EXPENSES' | 'CASH' | 'ADMIN' | 'SETTINGS';
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface AppNotification {
  notificationId: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'CASH_VARIANCE' | 'SECURITY' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  read: boolean;
  referenceId?: string;
  createdAt: string;
}
