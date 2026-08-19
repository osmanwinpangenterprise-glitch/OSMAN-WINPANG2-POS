import { BusinessSettings } from '../types';

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'Osman Winpang Enterprise',
  shortName: 'OWE POS',
  businessAddress: 'Plot 14, Commercial District, Main High Street, Kumasi / Accra, Ghana',
  phone: '+233 24 000 0000 / +233 50 000 0000',
  email: 'osmanwinpang@gmail.com',
  logoUrl: '',
  currency: 'GHS',
  currencySymbol: 'GH₵',
  taxName: 'VAT / NHIL / GETFund (15%)',
  taxRate: 0.15,
  taxEnabled: true,
  receiptPrefix: 'OWE',
  invoicePrefix: 'INV',
  lowStockThresholdDefault: 10,
  maxCashierDiscountPercent: 5,
  maxManagerDiscountPercent: 20,
  receiptFooter: 'Thank you for doing business with Osman Winpang Enterprise! Goods sold in good condition are non-refundable after 7 days.',
  allowNegativeStock: false,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Transport & Logistics',
  'Electricity / ECG',
  'Water / GWCL',
  'Shop Rent',
  'Staff Salaries & Allowances',
  'Internet & Phone Data',
  'Equipment Repairs & Maintenance',
  'Stationery & Packaging',
  'Security & Sanitation',
  'Bank & Mobile Money Charges',
  'Miscellaneous',
];

export const DEMO_STAFF = [
  {
    userId: 'admin-01',
    email: 'admin@osmanwinpang.com',
    fullName: 'Osman Winpang (Proprietor)',
    role: 'ADMINISTRATOR' as const,
    employeeId: 'EMP-001',
    status: 'ACTIVE' as const,
  },
  {
    userId: 'manager-01',
    email: 'manager@osmanwinpang.com',
    fullName: 'Abena Mensah (Store Manager)',
    role: 'MANAGER' as const,
    employeeId: 'EMP-002',
    status: 'ACTIVE' as const,
  },
  {
    userId: 'cashier-01',
    email: 'cashier1@osmanwinpang.com',
    fullName: 'Kwame Boateng (Lead Cashier)',
    role: 'CASHIER' as const,
    employeeId: 'EMP-003',
    status: 'ACTIVE' as const,
  },
  {
    userId: 'storekeeper-01',
    email: 'storekeeper@osmanwinpang.com',
    fullName: 'Kofi Owusu (Inventory Lead)',
    role: 'STOREKEEPER' as const,
    employeeId: 'EMP-004',
    status: 'ACTIVE' as const,
  },
];
