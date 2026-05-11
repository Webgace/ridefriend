// Ficheiro: src/store/authStore.ts | Função: estado de autenticação + persistência SecureStore (P1)
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { User } from '@types/index';
import * as SecureStore from 'expo-secure-store';
import { clearPushToken } from '@services/notifications.service';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => Promise<void>;
}

const SECURE_STORE_KEY = 'ridefriend_session';

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user }),

  setSession: (session) => {
    set({ session });
    if (session) {
      try {
        SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Error saving session to secure store:', error);
      }
    }
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  setIsAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });
  },

  logout: async () => {
    const userId = useAuthStore.getState().user?.id;
    try {
      if (userId) {
        await clearPushToken(userId);
      }
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },
}));

/**
 * Initialize auth store from secure storage
 */
export async function initializeAuthStore() {
  try {
    const storedSession = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (storedSession) {
      const session = JSON.parse(storedSession) as Session;
      useAuthStore.setState({
        session,
        isAuthenticated: true,
      });
    }
  } catch (error) {
    console.error('Error initializing auth store:', error);
  } finally {
    useAuthStore.setState({ isLoading: false });
  }
}
