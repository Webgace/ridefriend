// Ficheiro: src/store/marketStore.ts | Função: estado do mercado activo + persistência (PL1 v2.1)
import { create } from 'zustand';
import { MarketCode, MarketConfig } from '@types/index';
import { getMarketConfig } from '@config/markets';
import * as SecureStore from 'expo-secure-store';

interface MarketStore {
  config: MarketConfig | null;
  isLoaded: boolean;
  setMarket: (code: MarketCode) => Promise<void>;
  reset: () => Promise<void>;
  initialize: () => Promise<void>;
}

const MARKET_STORAGE_KEY = 'ridefriend_market_code';

export const useMarketStore = create<MarketStore>((set) => ({
  config: null,
  isLoaded: false,

  setMarket: async (code: MarketCode) => {
    try {
      const config = getMarketConfig(code);
      set({ config });

      // Persist market choice
      await SecureStore.setItemAsync(MARKET_STORAGE_KEY, code);
    } catch (error) {
      console.error('Error setting market:', error);
      throw error;
    }
  },

  reset: async () => {
    try {
      await SecureStore.deleteItemAsync(MARKET_STORAGE_KEY);
      set({
        config: null,
        isLoaded: false,
      });
    } catch (error) {
      console.error('Error resetting market:', error);
    }
  },

  initialize: async () => {
    try {
      const storedMarketCode = await SecureStore.getItemAsync(MARKET_STORAGE_KEY);

      if (storedMarketCode) {
        const config = getMarketConfig(storedMarketCode as MarketCode);
        set({
          config,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Error initializing market store:', error);
      set({ isLoaded: true });
    }
  },
}));
