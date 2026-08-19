import { doc, setDoc, getDocs, collection, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { Product, Category, Customer, Supplier, Expense } from '../types';

export interface DatabaseCollectionStats {
  products: number;
  categories: number;
  customers: number;
  suppliers: number;
  expenses: number;
  sales: number;
  stockMovements: number;
  cashSessions: number;
  heldSales: number;
  auditLogs: number;
  totalDocuments: number;
}

export type ClearDataScope = 'ALL' | 'TRANSACTIONS' | 'CATALOG' | 'CONTACTS';

// Helper to batch delete a collection safely
async function deleteCollectionDocs(collectionName: string): Promise<number> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    let deletedCount = 0;
    const docs = snap.docs;
    
    // Process in chunks of 400 for Firestore batch limits (500 max)
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
      deletedCount += chunk.length;
    }

    return deletedCount;
  } catch (err) {
    console.warn(`Error deleting collection ${collectionName}:`, err);
    // Fallback to individual deletes if batch fails
    try {
      const snap = await getDocs(collection(db, collectionName));
      let singleDeleted = 0;
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        singleDeleted++;
      }
      return singleDeleted;
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.DELETE, collectionName);
      return 0;
    }
  }
}

/**
 * Fetch current live document counts across all primary collections
 */
export async function getDatabaseStatistics(): Promise<DatabaseCollectionStats> {
  const collections = [
    'products',
    'categories',
    'customers',
    'suppliers',
    'expenses',
    'sales',
    'stockMovements',
    'cashSessions',
    'heldSales',
    'auditLogs',
  ];

  const counts: Record<string, number> = {};

  await Promise.all(
    collections.map(async (col) => {
      try {
        const snap = await getDocs(collection(db, col));
        counts[col] = snap.size;
      } catch {
        counts[col] = 0;
      }
    })
  );

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return {
    products: counts.products || 0,
    categories: counts.categories || 0,
    customers: counts.customers || 0,
    suppliers: counts.suppliers || 0,
    expenses: counts.expenses || 0,
    sales: counts.sales || 0,
    stockMovements: counts.stockMovements || 0,
    cashSessions: counts.cashSessions || 0,
    heldSales: counts.heldSales || 0,
    auditLogs: counts.auditLogs || 0,
    totalDocuments: total,
  };
}

/**
 * Clear data by scope:
 * - 'ALL': Complete clean slate (all collections + local caches)
 * - 'TRANSACTIONS': Sales, Expenses, Stock Movements, Cash Sessions, Held Sales, Audit Logs
 * - 'CATALOG': Products, Categories
 * - 'CONTACTS': Customers, Suppliers
 */
export async function clearSampleData(
  scope: ClearDataScope = 'ALL'
): Promise<{ success: boolean; deletedCount: number; message: string }> {
  try {
    let collectionsToClear: string[] = [];

    switch (scope) {
      case 'ALL':
        collectionsToClear = [
          'products',
          'categories',
          'customers',
          'suppliers',
          'expenses',
          'sales',
          'purchases',
          'stockMovements',
          'payments',
          'cashSessions',
          'heldSales',
          'auditLogs',
          'counters',
          'notifications',
        ];
        break;
      case 'TRANSACTIONS':
        collectionsToClear = [
          'sales',
          'purchases',
          'expenses',
          'stockMovements',
          'payments',
          'cashSessions',
          'heldSales',
          'auditLogs',
          'counters',
        ];
        break;
      case 'CATALOG':
        collectionsToClear = ['products', 'categories'];
        break;
      case 'CONTACTS':
        collectionsToClear = ['customers', 'suppliers'];
        break;
    }

    let totalDeleted = 0;
    for (const col of collectionsToClear) {
      const count = await deleteCollectionDocs(col);
      totalDeleted += count;
    }

    // Clean up local browser caches
    if (scope === 'ALL' || scope === 'TRANSACTIONS') {
      try {
        localStorage.removeItem('owe_pos_held_carts');
        localStorage.removeItem('owe_active_session_cache');
        localStorage.removeItem('owe_dismissed_inventory_alerts');
      } catch {
        // Ignore localStorage errors
      }
    }

    const scopeLabels: Record<ClearDataScope, string> = {
      ALL: 'All sample data and records cleared successfully.',
      TRANSACTIONS: 'Transaction history, test sales, expenses, and drawer sessions cleared.',
      CATALOG: 'Product catalog and categories cleared.',
      CONTACTS: 'Customer and supplier records cleared.',
    };

    return {
      success: true,
      deletedCount: totalDeleted,
      message: `${scopeLabels[scope]} Removed ${totalDeleted} database record${totalDeleted === 1 ? '' : 's'}.`,
    };
  } catch (err: unknown) {
    console.error('Error clearing data:', err);
    return {
      success: false,
      deletedCount: 0,
      message: err instanceof Error ? err.message : 'Error clearing sample database records.',
    };
  }
}

/**
 * Seed realistic sample demo data
 */
export async function seedDemoData(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Categories
    const categories: Category[] = [
      {
        categoryId: 'CAT-FOOD',
        name: 'Food & Groceries',
        description: 'Grains, oils, canned items, milk',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        categoryId: 'CAT-BEV',
        name: 'Beverages & Water',
        description: 'Bottled water, sodas, juices',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        categoryId: 'CAT-TOIL',
        name: 'Toiletries & Cleaning',
        description: 'Soaps, detergents, tissue',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        categoryId: 'CAT-ELEC',
        name: 'Electronics & Accessories',
        description: 'Cables, bulbs, power banks',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        categoryId: 'CAT-HARD',
        name: 'Building & Hardware',
        description: 'Cement, nails, locks',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const cat of categories) {
      await setDoc(doc(db, 'categories', cat.categoryId), cat);
    }

    // 2. Suppliers
    const suppliers: Supplier[] = [
      {
        supplierId: 'SUPP-01',
        supplierCode: 'SUPP-101',
        companyName: 'Olam Ghana Ltd',
        contactPerson: 'Kwabena Darko',
        phone: '+233 24 411 2233',
        email: 'orders@olamghana.com',
        address: 'Tema Industrial Area, Accra',
        balance: 4500,
        totalPurchased: 28500,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        supplierId: 'SUPP-02',
        supplierCode: 'SUPP-102',
        companyName: 'Unilever Ghana PLC',
        contactPerson: 'Grace Antwi',
        phone: '+233 20 899 7766',
        email: 'sales@unilevergh.com',
        address: 'Plot 23, Heavy Industrial Area, Tema',
        balance: 1200,
        totalPurchased: 15400,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        supplierId: 'SUPP-03',
        supplierCode: 'SUPP-103',
        companyName: 'Voltic Ghana Limited',
        contactPerson: 'Samuel Addo',
        phone: '+233 50 123 4567',
        email: 'distributors@volticgh.com',
        address: 'Medie, Greater Accra',
        balance: 0,
        totalPurchased: 9800,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const sup of suppliers) {
      await setDoc(doc(db, 'suppliers', sup.supplierId), sup);
    }

    // 3. Products
    const products: Product[] = [
      {
        productId: 'PROD-01',
        barcode: '600100101',
        sku: 'RIC-50KG-01',
        name: 'Royal Feast Perfumed Rice 50kg',
        description: 'Grade A Long Grain Jasmine Rice',
        categoryId: 'CAT-FOOD',
        categoryName: 'Food & Groceries',
        unit: 'BAG',
        costPrice: 620,
        sellingPrice: 720,
        wholesalePrice: 690,
        currentStock: 45,
        reorderLevel: 10,
        supplierId: 'SUPP-01',
        supplierName: 'Olam Ghana Ltd',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-02',
        barcode: '600100102',
        sku: 'OIL-5L-01',
        name: 'Frytol Vegetable Cooking Oil 5L',
        description: 'Pure Vegetable Cooking Oil',
        categoryId: 'CAT-FOOD',
        categoryName: 'Food & Groceries',
        unit: 'BOX',
        costPrice: 165,
        sellingPrice: 195,
        wholesalePrice: 185,
        currentStock: 32,
        reorderLevel: 8,
        supplierId: 'SUPP-01',
        supplierName: 'Olam Ghana Ltd',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-03',
        barcode: '600100103',
        sku: 'MIL-400G-01',
        name: 'Nestlé Milo Chocolate Malt 400g',
        description: 'Energy Food Drink Tin',
        categoryId: 'CAT-FOOD',
        categoryName: 'Food & Groceries',
        unit: 'PCS',
        costPrice: 38,
        sellingPrice: 48,
        wholesalePrice: 44,
        currentStock: 75,
        reorderLevel: 15,
        supplierId: 'SUPP-02',
        supplierName: 'Unilever Ghana PLC',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-04',
        barcode: '600100104',
        sku: 'VOL-750ML-01',
        name: 'Voltic Mineral Water (1.5L x 12 Pack)',
        description: 'Pack of 12 bottles',
        categoryId: 'CAT-BEV',
        categoryName: 'Beverages & Water',
        unit: 'PACK',
        costPrice: 32,
        sellingPrice: 42,
        wholesalePrice: 38,
        currentStock: 120,
        reorderLevel: 25,
        supplierId: 'SUPP-03',
        supplierName: 'Voltic Ghana Limited',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-05',
        barcode: '600100105',
        sku: 'ARI-1KG-01',
        name: 'Ariel Auto Washing Powder 1kg',
        description: 'Original Scent Detergent',
        categoryId: 'CAT-TOIL',
        categoryName: 'Toiletries & Cleaning',
        unit: 'PCS',
        costPrice: 28,
        sellingPrice: 38,
        wholesalePrice: 34,
        currentStock: 60,
        reorderLevel: 12,
        supplierId: 'SUPP-02',
        supplierName: 'Unilever Ghana PLC',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-06',
        barcode: '600100106',
        sku: 'GEI-425G-01',
        name: 'Geisha Mackerel in Tomato Sauce 425g',
        description: 'Canned Mackerel Big Tin',
        categoryId: 'CAT-FOOD',
        categoryName: 'Food & Groceries',
        unit: 'PCS',
        costPrice: 22,
        sellingPrice: 28,
        wholesalePrice: 25,
        currentStock: 90,
        reorderLevel: 20,
        supplierId: 'SUPP-01',
        supplierName: 'Olam Ghana Ltd',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-07',
        barcode: '600100107',
        sku: 'CEM-50KG-01',
        name: 'Ghacem Super Rapid Cement 50kg',
        description: 'Grade 42.5N High Strength',
        categoryId: 'CAT-HARD',
        categoryName: 'Building & Hardware',
        unit: 'BAG',
        costPrice: 88,
        sellingPrice: 102,
        wholesalePrice: 96,
        currentStock: 6,
        reorderLevel: 15,
        supplierId: 'SUPP-01',
        supplierName: 'Olam Ghana Ltd',
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'PROD-08',
        barcode: '600100108',
        sku: 'LED-15W-01',
        name: 'Philips LED Bulb 15W Daylight',
        description: 'Energy Saving E27 Bulb',
        categoryId: 'CAT-ELEC',
        categoryName: 'Electronics & Accessories',
        unit: 'PCS',
        costPrice: 18,
        sellingPrice: 28,
        wholesalePrice: 24,
        currentStock: 4,
        reorderLevel: 10,
        taxRate: 0.15,
        taxable: true,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const prod of products) {
      await setDoc(doc(db, 'products', prod.productId), prod);
    }

    // 4. Customers
    const customers: Customer[] = [
      {
        customerId: 'CUST-01',
        customerCode: 'CUST-201',
        fullName: 'Mama Akosua Enterprise',
        phone: '+233 24 555 6677',
        email: 'akosua.store@gmail.com',
        address: 'Kejetia Market, Stall 4B, Kumasi',
        customerType: 'WHOLESALE',
        creditLimit: 5000,
        balance: 1850,
        totalPurchases: 22400,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        customerId: 'CUST-02',
        customerCode: 'CUST-202',
        fullName: 'Uncle Kweku Provisions',
        phone: '+233 50 888 1122',
        email: 'kweku.provisions@yahoo.com',
        address: 'Adum Central, Kumasi',
        customerType: 'CREDIT',
        creditLimit: 3000,
        balance: 650,
        totalPurchases: 14200,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        customerId: 'CUST-03',
        customerCode: 'CUST-203',
        fullName: 'Ebenezer Quaye',
        phone: '+233 27 333 4455',
        email: 'equaye@gmail.com',
        address: 'Airport Residential, Accra',
        customerType: 'REGULAR',
        creditLimit: 0,
        balance: 0,
        totalPurchases: 3200,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const cust of customers) {
      await setDoc(doc(db, 'customers', cust.customerId), cust);
    }

    // 5. Initial Expenses
    const expenses: Expense[] = [
      {
        expenseId: 'EXP-01',
        date: new Date().toISOString(),
        category: 'Transport & Logistics',
        description: 'Store supply offloading & cartage',
        amount: 150,
        paymentMethod: 'CASH',
        recordedBy: 'admin-01',
        recordedByName: 'Osman Winpang',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        expenseId: 'EXP-02',
        date: new Date().toISOString(),
        category: 'Electricity / ECG',
        description: 'Prepaid meter top-up for store coolers',
        amount: 300,
        paymentMethod: 'MOBILE_MONEY',
        recordedBy: 'manager-01',
        recordedByName: 'Abena Mensah',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const exp of expenses) {
      await setDoc(doc(db, 'expenses', exp.expenseId), exp);
    }

    return { success: true, message: 'Demo catalog, suppliers, and customers seeded successfully!' };
  } catch (err: unknown) {
    console.error('Error seeding data:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Error seeding demo data' };
  }
}

export const seedInitialDemoData = seedDemoData;
