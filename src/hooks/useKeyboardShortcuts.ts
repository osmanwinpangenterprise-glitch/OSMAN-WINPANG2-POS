import { useEffect } from 'react';

export interface ShortcutHandlers {
  onSearchProduct?: () => void; // F2
  onSelectCustomer?: () => void; // F4
  onOpenPayment?: () => void; // F6
  onHoldSale?: () => void; // F8
  onRetrieveSale?: () => void; // F9
  onCompleteSale?: () => void; // F10
  onCloseModal?: () => void; // ESC
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          handlers.onSearchProduct?.();
          break;
        case 'F4':
          e.preventDefault();
          handlers.onSelectCustomer?.();
          break;
        case 'F6':
          e.preventDefault();
          handlers.onOpenPayment?.();
          break;
        case 'F8':
          e.preventDefault();
          handlers.onHoldSale?.();
          break;
        case 'F9':
          e.preventDefault();
          handlers.onRetrieveSale?.();
          break;
        case 'F10':
          e.preventDefault();
          handlers.onCompleteSale?.();
          break;
        case 'Escape':
          handlers.onCloseModal?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
