// Ficheiro: src/store/emergencyContactStore.ts | Função: contacto de emergência persistido em MMKV (P8)
// Nota: MMKV mantém o contacto por dispositivo. O schema actual (sos_events) não guarda
// emergency_contact_id; a info é local e enviada como payload em cada SOS.
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

export interface EmergencyContact {
  /** Identificador estável: id de contacto da rede ou prefixo `external:<phone>` para externos. */
  id: string;
  name: string;
  phone: string;
  /** True quando o contacto foi inserido manualmente (não é utilizador RideFriend). */
  isExternal: boolean;
}

const STORAGE = new MMKV({ id: 'ridefriend-emergency' });
const KEY = 'emergency.contact';

interface EmergencyContactState {
  contact: EmergencyContact | null;
  isHydrated: boolean;
  hydrate: () => void;
  setContact: (contact: EmergencyContact) => void;
  clearContact: () => void;
}

export const useEmergencyContactStore = create<EmergencyContactState>((set) => ({
  contact: null,
  isHydrated: false,

  hydrate: () => {
    const raw = STORAGE.getString(KEY);
    if (!raw) {
      set({ contact: null, isHydrated: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as EmergencyContact;
      set({ contact: parsed, isHydrated: true });
    } catch {
      STORAGE.delete(KEY);
      set({ contact: null, isHydrated: true });
    }
  },

  setContact: (contact) => {
    STORAGE.set(KEY, JSON.stringify(contact));
    set({ contact });
  },

  clearContact: () => {
    STORAGE.delete(KEY);
    set({ contact: null });
  },
}));
