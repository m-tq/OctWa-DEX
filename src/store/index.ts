import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Connection, Capability } from '@octwa/sdk';
import type { Quote, SwapRecord, SwapStatus } from '../types/intent';

interface AppError {
  id: string;
  code: string;
  message: string;
  timestamp: number;
}

interface Store {
  // Connection
  connected: boolean;
  connection: Connection | null;
  capability: Capability | null;

  // Derived EVM address (from same key)
  derivedEvmAddress: string | null;

  // Balance
  octBalance: number | null;
  balanceLoading: boolean;

  // Quote (from backend API)
  quote: Quote | null;
  quoteLoading: boolean;

  // Swaps
  swaps: SwapRecord[];
  currentSwapStatus: SwapStatus;

  // Errors
  errors: AppError[];

  // Actions
  setConnection: (conn: Connection | null) => void;
  setCapability: (cap: Capability | null) => void;
  setDerivedEvmAddress: (address: string | null) => void;
  setOctBalance: (balance: number | null) => void;
  setBalanceLoading: (loading: boolean) => void;
  setQuote: (quote: Quote | null) => void;
  setQuoteLoading: (loading: boolean) => void;
  setCurrentSwapStatus: (status: SwapStatus) => void;
  addSwap: (swap: SwapRecord) => void;
  updateSwap: (id: string, updates: Partial<SwapRecord>) => void;
  setSwaps: (swaps: SwapRecord[]) => void;
  addError: (code: string, message: string) => void;
  clearErrors: () => void;
  reset: () => void;
  
  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const initialState = {
  connected: false,
  connection: null,
  capability: null,
  derivedEvmAddress: null,
  octBalance: null,
  balanceLoading: false,
  quote: null,
  quoteLoading: false,
  swaps: [],
  currentSwapStatus: 'idle' as SwapStatus,
  errors: [],
  _hasHydrated: false,
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initialState,

      setConnection: (conn) =>
        set({
          connected: conn !== null,
          connection: conn,
        }),

      setCapability: (cap) => set({ capability: cap }),

      setDerivedEvmAddress: (address) => set({ derivedEvmAddress: address }),

      setOctBalance: (balance) => set({ octBalance: balance }),

      setBalanceLoading: (loading) => set({ balanceLoading: loading }),

      setQuote: (quote) => set({ quote }),

      setQuoteLoading: (loading) => set({ quoteLoading: loading }),

      setCurrentSwapStatus: (status) => set({ currentSwapStatus: status }),

      addSwap: (swap) =>
        set((state) => ({
          swaps: [swap, ...state.swaps],
        })),

      updateSwap: (id, updates) =>
        set((state) => ({
          swaps: state.swaps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      setSwaps: (swaps) => set({ swaps }),

      addError: (code, message) =>
        set((state) => ({
          errors: [
            ...state.errors,
            {
              id: crypto.randomUUID(),
              code,
              message,
              timestamp: Date.now(),
            },
          ],
        })),

      clearErrors: () => set({ errors: [] }),

      reset: () => set(initialState),
      
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'octra-dex-storage',
      // Only persist connection state, NOT capability (must be fresh from wallet)
      partialize: (state) => ({
        connection: state.connection,
        connected: state.connected,
        derivedEvmAddress: state.derivedEvmAddress,
        // capability NOT persisted - must request fresh from wallet each session
        // swaps are fetched from backend, not persisted locally
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Capability is not persisted, so no need to check expiry
      },
    }
  )
);
