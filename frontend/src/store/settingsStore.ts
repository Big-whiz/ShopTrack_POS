import { create } from 'zustand';
import api from '../services/api';

export interface ShopSettings {
    id: number;
    store_name: string;
    currency_symbol: string;
    tax_rate_percent: string | number; // Decimal comes as string or number
    receipt_footer_msg: string;
    enable_receipt_print: boolean;
}

interface SettingsState {
    settings: ShopSettings | null;
    isLoading: boolean;
    error: string | null;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    settings: null,
    isLoading: false,
    error: null,

    fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.get<ShopSettings>('/settings');
            set({ settings: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to load settings', isLoading: false });
        }
    },

    updateSettings: async (newSettings) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.put<ShopSettings>('/settings', newSettings);
            set({ settings: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Failed to update settings', isLoading: false });
            throw err;
        }
    },
}));
