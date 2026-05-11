// Ficheiro: src/store/uiHostStore.ts | Função: store imperativa de Toast + ConfirmSheet
// Substitui Alert.alert (proibido por P0 v2.1: "Modais: BottomSheet ou Toast — nunca Alert.alert()").
import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastConfig {
  id: number;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

export interface ConfirmConfig {
  id: number;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}

interface UiHostState {
  toast: ToastConfig | null;
  confirm: ConfirmConfig | null;
  showToast: (input: { message: string; tone?: ToastTone; durationMs?: number }) => void;
  hideToast: () => void;
  showConfirm: (input: Omit<ConfirmConfig, 'id'>) => void;
  hideConfirm: () => void;
}

let nextId = 1;

export const useUiHostStore = create<UiHostState>((set) => ({
  toast: null,
  confirm: null,

  showToast: ({ message, tone = 'info', durationMs = 2500 }) => {
    set({ toast: { id: nextId++, message, tone, durationMs } });
  },

  hideToast: () => set({ toast: null }),

  showConfirm: (input) => {
    set({ confirm: { id: nextId++, cancelLabel: input.cancelLabel, ...input } });
  },

  hideConfirm: () => set({ confirm: null }),
}));
