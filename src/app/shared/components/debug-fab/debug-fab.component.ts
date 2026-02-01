import { Component, inject, signal, computed, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkService, type Work, type WorkStatus, type PartnerResponseStatus } from '../../../services/work.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-debug-fab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './debug-fab.component.html',
  styleUrl: './debug-fab.component.css',
})
export class DebugFabComponent {
  private workService = inject(WorkService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  /** Solo mostrar en desarrollo (no producción). */
  readonly isProduction = !isDevMode();

  isOpen = signal(false);
  selectedWorkId = signal<string | null>(null);

  worksForDebug = computed(() => {
    const all = this.workService.works();
    const mine = this.workService.myWorks();
    return all.length > 0 ? all : mine;
  });

  selectedWork = computed(() => {
    const id = this.selectedWorkId();
    if (!id) return null;
    return this.workService.works().find((w) => w.id === id)
      ?? this.workService.myWorks().find((w) => w.id === id) ?? null;
  });

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next && !this.selectedWorkId() && this.worksForDebug().length > 0) {
      this.selectedWorkId.set(this.worksForDebug()[0].id);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  selectWork(workId: string): void {
    this.selectedWorkId.set(workId);
  }

  private notifySuccess(title: string, message: string): void {
    this.notificationService.add({ title, message, type: 'success' });
  }

  approveCredit(): void {
    const workId = this.selectedWorkId();
    if (!workId) return;
    this.workService.setWorkStatus(workId, 'CREDIT_APPROVED' as WorkStatus).subscribe({
      next: () => {
        this.close();
      },
      error: (err) => console.error('[DebugFab] approveCredit:', err),
    });
  }

  sendToPartners(): void {
    const workId = this.selectedWorkId();
    if (!workId) return;
    this.workService.setWorkToWaitingPartners(workId).subscribe({
      next: () => {
        this.notifySuccess('✓ Enviado', 'Obra en WAITING_PARTNERS con deadline 48h.');
        this.close();
      },
      error: (err) => console.error('[DebugFab] sendToPartners:', err),
    });
  }

  simulatePartnersOk(): void {
    const work = this.selectedWork();
    const workId = this.selectedWorkId();
    if (!workId || !work) return;
    const items = work.items ?? [];
    const partnerIds = [...new Set(items.map((i) => i.partnerId).filter(Boolean))];
    const partnerResponses: Record<string, PartnerResponseStatus> = {};
    partnerIds.forEach((id) => (partnerResponses[id] = 'CONFIRMED'));
    if (partnerIds.length === 0) {
      this.notifySuccess('⚠ Sin partners', 'La obra no tiene items con partnerId.');
      return;
    }
    this.workService.updatePartnerResponse(workId, partnerResponses).subscribe({
      next: () => {
        this.notifySuccess('✓ Simulado', 'Todos los partners en CONFIRMED.');
        this.close();
      },
      error: (err) => console.error('[DebugFab] simulatePartnersOk:', err),
    });
  }

  startWork(): void {
    const workId = this.selectedWorkId();
    if (!workId) return;
    this.workService.confirmStartWork(workId).subscribe({
      next: () => {
        this.close();
      },
      error: (err) => console.error('[DebugFab] startWork:', err),
    });
  }

  clearAll(): void {
    localStorage.clear();
    this.notifySuccess('✓ Limpiado', 'localStorage borrado. Redirigiendo al login.');
    this.close();
    this.router.navigate(['/login']);
  }

  workLabel(work: Work): string {
    const shortId = work.id.slice(0, 8);
    return `${shortId}… ${work.userEmail ?? work.status}`;
  }
}
