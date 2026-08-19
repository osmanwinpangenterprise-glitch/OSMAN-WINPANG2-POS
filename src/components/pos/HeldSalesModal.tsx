import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { HeldSale } from '../../types';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Modal } from '../common/Modal';
import { Clock, Play, Trash2, User, ShoppingBag } from 'lucide-react';

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeldSalesModal({ isOpen, onClose }: HeldSalesModalProps) {
  const { retrieveHeldSale } = useCart();
  const { formatCurrency } = useSettings();
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'heldSales'), where('status', '==', 'HELD'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => d.data() as HeldSale);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHeldSales(list);
        setLoading(false);
      },
      (err) => {
        console.debug('Error loading held sales:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleRetrieve = (held: HeldSale) => {
    retrieveHeldSale(held);
    onClose();
  };

  const handleDelete = async (heldSaleId: string) => {
    try {
      await deleteDoc(doc(db, 'heldSales', heldSaleId));
    } catch (err) {
      console.warn('Could not delete held sale:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Held Sales Recall Queue" maxWidth="lg">
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Restore parked customer carts to resume checkout or discard them:
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading held carts...</div>
        ) : heldSales.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-1">
            <Clock className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="font-semibold text-slate-400">No Held Sales in Queue</p>
            <p className="text-[11px] text-slate-600">Press F8 while building an order to put a sale on hold.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {heldSales.map((held) => (
              <div
                key={held.heldSaleId}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100">{held.customerName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(held.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{held.items.length} items</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(held.total)}</span>
                  </div>
                  {held.notes && <p className="text-[11px] text-amber-300 italic">Note: {held.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(held.heldSaleId)}
                    className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors border border-slate-800"
                    title="Discard held sale"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRetrieve(held)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Retrieve (F9)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
