// Ficheiro: src/hooks/useAuth.ts | Função: hook fino sobre authStore + acções de auth (P3)
import { useAuthStore } from '@store/authStore';
import { sendOTP, verifyOTP, signOut, refreshSession } from '@services/auth.service';

export function useAuth() {
  const authState = useAuthStore();

  return {
    ...authState,
    sendOTP,
    verifyOTP,
    signOut,
    refreshSession,
  };
}
