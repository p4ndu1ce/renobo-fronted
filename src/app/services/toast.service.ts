import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Muestra un toast que se elimina automáticamente a los 3 segundos.
   */
  show(message: string, type: ToastType = 'success'): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, message, type };
    this._toasts.update((list) => [...list, toast]);

    const timer = setTimeout(() => {
      this.dismiss(id);
      this.timers.delete(id);
    }, AUTO_DISMISS_MS);
    this.timers.set(id, timer);
  }

  /** Elimina un toast por id. */
  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
