import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  let id = 0;

  function add(message: string, type: ToastType = 'info', duration = 5000) {
    const toast: Toast = {
      id: id++,
      message,
      type,
      duration,
    };

    update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        remove(toast.id);
      }, duration);
    }

    return toast.id;
  }

  function remove(id: number) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }

  return {
    subscribe,
    success: (message: string, duration?: number) => add(message, 'success', duration),
    error: (message: string, duration?: number) => add(message, 'error', duration),
    info: (message: string, duration?: number) => add(message, 'info', duration),
    warning: (message: string, duration?: number) => add(message, 'warning', duration),
    remove,
  };
}

export const toast = createToastStore();
