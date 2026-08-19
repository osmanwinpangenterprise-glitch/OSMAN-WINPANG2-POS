import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { AuditLog } from '../types';

export async function logAuditEvent(
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  module: AuditLog['module'],
  description: string,
  referenceId?: string
): Promise<void> {
  try {
    const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const logEntry: AuditLog = {
      logId,
      userId,
      userName,
      userRole,
      action,
      module,
      description,
      referenceId: referenceId || undefined,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'auditLogs', logId), logEntry);
  } catch (err) {
    console.warn('Could not write audit log:', err);
  }
}

export async function getRecentAuditLogs(max: number = 50): Promise<AuditLog[]> {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => docSnap.data() as AuditLog);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'auditLogs');
    return [];
  }
}
