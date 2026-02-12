import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

export type NotificationType = 'success' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  workId?: string;
}

export type AddNotificationInput = Partial<Pick<AppNotification, 'title' | 'type'>> & {
  message: string;
  isRead?: boolean;
};

interface NotificationsApiResponse {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    workId?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly API = `${environment.apiUrl}/notifications`;
  private notifications = signal<AppNotification[]>([]);

  /** Lista de notificaciones (las más recientes primero). */
  readonly notificationsList = this.notifications.asReadonly();

  /** Cantidad de notificaciones sin leer. */
  readonly unreadCount = computed(() =>
    this.notifications().filter((n) => !n.isRead).length
  );

  /**
   * Carga notificaciones desde el backend (persistidas). No hace petición si no hay token (evita 401).
   */
  loadFromServer(): void {
    if (!this.authService.getToken()) return;
    this.http.get<NotificationsApiResponse>(this.API).pipe(
      tap((res) => {
        const list = (res?.notifications ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: (n.type === 'success' || n.type === 'warning' ? n.type : 'info') as NotificationType,
          timestamp: n.createdAt,
          isRead: n.read,
          workId: n.workId,
        }));
        this.notifications.set(list);
      }),
      catchError((err) => {
        console.error('Error al cargar notificaciones:', err);
        return of(undefined);
      })
    ).subscribe();
  }

  /**
   * Inserta una nueva alerta al principio de la lista (solo en memoria; para toasts o avisos locales).
   * Las notificaciones persistentes las crea el backend cuando cambia el estado de una obra.
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

  /** Marca una notificación como leída (persiste en backend si tiene id de servidor). */
  markAsRead(id: string): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (!id.startsWith('n-')) {
      this.http.patch(`${this.API}/${id}/read`, {}).pipe(
        catchError((err) => {
          console.error('Error al marcar notificación como leída:', err);
          return of(undefined);
        })
      ).subscribe();
    }
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
