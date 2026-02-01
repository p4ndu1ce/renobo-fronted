import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent {
  private notificationService = inject(NotificationService);

  notifications = this.notificationService.notificationsList;
  /** Últimas 5 notificaciones para el panel desplegable. */
  lastFive = computed(() => this.notifications().slice(0, 5));
  unreadCount = this.notificationService.unreadCount;
  isPanelOpen = signal(false);

  togglePanel(): void {
    this.isPanelOpen.update((v) => !v);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  remove(id: string): void {
    this.notificationService.remove(id);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return 'Ahora';
    if (diffM < 60) return `Hace ${diffM} min`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return diffD === 1 ? 'Ayer' : `Hace ${diffD} días`;
  }
}
