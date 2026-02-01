import { Injectable, signal, computed } from '@angular/core';

export type NotificationType = 'success' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
}

export type AddNotificationInput = Partial<Pick<AppNotification, 'title' | 'type'>> & {
  message: string;
  isRead?: boolean;
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications = signal<AppNotification[]>([]);

  /** Lista de notificaciones (las más recientes primero). */
  readonly notificationsList = this.notifications.asReadonly();

  /** Cantidad de notificaciones sin leer. */
  readonly unreadCount = computed(() =>
    this.notifications().filter((n) => !n.isRead).length
  );

  /**
   * Inserta una nueva alerta al principio de la lista.
   * Cualquier parte de la app (Supervisor, Ingeniero, Debug Panel) puede llamar para avisar al usuario.
   */
  add(input: AddNotificationInput): void {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const rawType = (input.type ?? 'info') as string;
    const type: NotificationType =
      rawType === 'SUCCESS' || rawType === 'success' ? 'success'
        : rawType === 'WARNING' || rawType === 'warning' ? 'warning'
          : 'info';
    const notification: AppNotification = {
      id,
      title: input.title ?? '',
      message: input.message,
      type,
      timestamp: new Date().toISOString(),
      isRead: input.isRead ?? false,
    };
    this.notifications.update((list) => [notification, ...list]);
  }

  /** Marca una notificación como leída. */
  markAsRead(id: string): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  /** Pone todos los isRead en true. */
  markAllAsRead(): void {
    this.notifications.update((list) =>
      list.map((n) => ({ ...n, isRead: true }))
    );
  }

  /** Elimina una notificación. */
  remove(id: string): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }

  /** Elimina todas. */
  clear(): void {
    this.notifications.set([]);
  }
}
