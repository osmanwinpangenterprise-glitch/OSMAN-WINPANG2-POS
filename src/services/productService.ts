import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { Product, Category } from '../types';
import { logAuditEvent } from './auditService';

export async function getProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, 'products'), where('status', '!=', 'ARCHIVED'), orderBy('status'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Product);
  } catch {
    // Fallback if composite index is pending
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      return snapshot.docs
        .map((d) => d.data() as Product)
        .filter((p) => p.status !== 'ARCHIVED')
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'products');
      return [];
    }
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Category);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'categories');
    return [];
  }
}

export async function checkBarcodeExists(barcode: string, excludeProductId?: string): Promise<boolean> {
  if (!barcode.trim()) return false;
  try {
    const q = query(collection(db, 'products'), where('barcode', '==', barcode.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return false;
    if (excludeProductId) {
      return snap.docs.some((d) => d.id !== excludeProductId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  if (!barcode.trim()) return null;
  try {
    const q = query(collection(db, 'products'), where('barcode', '==', barcode.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Product;
  } catch {
    return null;
  }
}

export async function createProduct(
  productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<Product> {
  try {
    const productId = `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newProduct: Product = {
      ...productData,
      productId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
    };

    await setDoc(doc(db, 'products', productId), newProduct);

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'CREATE_PRODUCT',
      'INVENTORY',
      `Created product: ${newProduct.name} (${newProduct.barcode}) with stock ${newProduct.currentStock}`,
      productId
    );

    return newProduct;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'products');
    throw err;
  }
}

export async function updateProduct(
  productId: string,
  updates: Partial<Product>,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    const productRef = doc(db, 'products', productId);
    const existingSnap = await getDoc(productRef);
    const existing = existingSnap.data() as Product | undefined;

    const merged = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await updateDoc(productRef, merged);

    await logAuditEvent(
      userId,
      userName,
      userRole,
      'UPDATE_PRODUCT',
      'INVENTORY',
      `Updated product details for ${existing?.name || productId}`,
      productId
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
    throw err;
  }
}

export async function archiveProduct(productId: string, userId: string, userName: string, userRole: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'products', productId), {
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });

    await logAuditEvent(userId, userName, userRole, 'DEACTIVATE_PRODUCT', 'INVENTORY', `Archived product ID: ${productId}`, productId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    throw err;
  }
}

export async function saveCategory(category: Omit<Category, 'createdAt' | 'updatedAt'>): Promise<Category> {
  try {
    const categoryId = category.categoryId || `CAT-${Date.now()}`;
    const categoryData: Category = {
      ...category,
      categoryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'categories', categoryId), categoryData, { merge: true });
    return categoryData;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `categories/${category.categoryId}`);
    throw err;
  }
}
