import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  Edit2,
  Power,
} from 'lucide-react';

export function UserManagementView() {
  const { profile } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add / Edit Staff Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [pinCode, setPinCode] = useState('1234');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as UserProfile);
        setUsers(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setRole('CASHIER');
    setPinCode('1234');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: UserProfile) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setRole(u.role);
    setPinCode(u.pinCode || '1234');
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      warning('Validation Error', 'Full Name and Email are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.userId), {
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          pinCode: pinCode.trim() || '1234',
        });
        success('Staff Updated', `${fullName} profile updated.`);
      } else {
        const newId = `user-${Date.now().toString(36)}`;
        await setDoc(doc(db, 'users', newId), {
          userId: newId,
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role,
          pinCode: pinCode.trim() || '1234',
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        success('Staff Created', `${fullName} added as ${role}.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      toastError('Save Error', err instanceof Error ? err.message : 'Error saving staff.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', u.userId), {
        isActive: !u.isActive,
      });
      success('Status Changed', `${u.fullName} is now ${!u.isActive ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      toastError('Error', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Staff & Role-Based Access Control (RBAC)</h2>
          <p className="text-xs text-slate-400">
            Manage user roles, POS Quick-Switch PIN codes, and access permissions
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Roster Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role & Permissions</th>
                <th className="px-4 py-3 text-center">Quick PIN</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading staff directory...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-100">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          u.role === 'ADMINISTRATOR'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : u.role === 'MANAGER'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : u.role === 'STOREKEEPER'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-400">••••</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit staff details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Toggle active status"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit Staff: ${editingUser.fullName}` : 'Add Staff Member'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Samuel Osei"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="samuel@enterprise.com"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Security Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CASHIER">Cashier (POS & Sales only)</option>
                <option value="STOREKEEPER">Storekeeper (Inventory & Receiving)</option>
                <option value="MANAGER">Manager (Discounts, Voids & Reports)</option>
                <option value="ADMINISTRATOR">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">POS PIN Code (4 Digits)</label>
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="1234"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono text-center tracking-widest focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              {saving ? 'Saving...' : 'Save Staff Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
