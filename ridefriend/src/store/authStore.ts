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
 * Initialize auth store from secure storage.
 *
 * Boot-time flow:
 *  1) Lê a sessão guardada (SecureStore) → marca isAuthenticated = true.
 *  2) Se há sessão, **busca também o perfil em public.users** e popula `user`.
 *     Sem isto, o RootNavigator vê isAuthenticated=true mas user=null e leva o
 *     utilizador directo ao MainStack sem perfil (bug que aconteceu com o auto-admin).
 *  3) Se a sessão expirou ou o perfil não existe, deixa `user = null` —
 *     RootNavigator vai mandar para Onboarding (gating em user.termsAcceptedAt).
 */
export async function initializeAuthStore() {
  try {
    const storedSession = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (!storedSession) return;
    const session = JSON.parse(storedSession) as Session;
    useAuthStore.setState({ session, isAuthenticated: true });

    // Carrega o perfil. Import dinâmico para evitar ciclo de imports
    // (auth.service.ts importa authStore).
    if (session.user?.id) {
      try {
        const { loadUserProfileIntoStore } = await import('@services/auth.service');
        await loadUserProfileIntoStore(session.user.id);
      } catch (e) {
        console.warn('initializeAuthStore: profile fetch failed', e);
      }
    }
  } catch (error) {
    console.error('Error initializing auth store:', error);
  } finally {
    useAuthStore.setState({ isLoading: false });
  }
}
