import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product, CartItem } from '../types';

interface CartState {
    posCart: CartItem[];
    creditCart: CartItem[];

    // POS Actions
    addToPosCart: (product: Product) => void;
    updatePosQty: (productId: number, delta: number) => void;
    removeFromPosCart: (productId: number) => void;
    clearPosCart: () => void;

    // Credit Actions
    addToCreditCart: (product: Product) => void;
    updateCreditQty: (productId: number, delta: number) => void;
    removeFromCreditCart: (productId: number) => void;
    clearCreditCart: () => void;
}

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            posCart: [],
            creditCart: [],

            // POS Implementation
            addToPosCart: (product) => set((state) => {
                const existing = state.posCart.find((c) => c.product.id === product.id);
                if (existing) {
                    if (existing.quantity >= product.current_stock) return state;
                    return {
                        posCart: state.posCart.map((c) =>
                            c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
                        ),
                    };
                }
                return { posCart: [...state.posCart, { product, quantity: 1 }] };
            }),
            updatePosQty: (productId, delta) => set((state) => ({
                posCart: state.posCart
                    .map((c) => c.product.id === productId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
                    .filter((c) => c.quantity > 0),
            })),
            removeFromPosCart: (productId) => set((state) => ({
                posCart: state.posCart.filter((c) => c.product.id !== productId),
            })),
            clearPosCart: () => set({ posCart: [] }),

            // Credit Implementation
            addToCreditCart: (product) => set((state) => {
                const existing = state.creditCart.find((c) => c.product.id === product.id);
                if (existing) {
                    if (existing.quantity >= product.current_stock) return state;
                    return {
                        creditCart: state.creditCart.map((c) =>
                            c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
                        ),
                    };
                }
                return { creditCart: [...state.creditCart, { product, quantity: 1 }] };
            }),
            updateCreditQty: (productId, delta) => set((state) => ({
                creditCart: state.creditCart
                    .map((c) => c.product.id === productId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)
                    .filter((c) => c.quantity > 0),
            })),
            removeFromCreditCart: (productId) => set((state) => ({
                creditCart: state.creditCart.filter((c) => c.product.id !== productId),
            })),
            clearCreditCart: () => set({ creditCart: [] }),
        }),
        {
            name: 'shoptrack-cart-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
