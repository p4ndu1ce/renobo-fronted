import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isDevMode } from '@angular/core';
import { WorkService, type Work, type WorkStatus } from '../../services/work.service';

const DEBUG_STATUSES: WorkStatus[] = ['CREDIT_APPROVED', 'WAITING_PARTNERS', 'IN_PROGRESS'];

@Component({
  selector: 'app-debug-fab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './debug-fab.component.html',
  styleUrl: './debug-fab.component.css',
})
export class DebugFabComponent {
  private workService = inject(WorkService);

  readonly isDev = isDevMode();
  isOpen = signal(false);
  selectedWorkId = signal<string | null>(null);

  /** Obras disponibles: todas (works) o las del usuario (myWorks) si no hay todas cargadas. */
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

  readonly statusOptions = DEBUG_STATUSES;

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

  setStatus(status: WorkStatus): void {
    const workId = this.selectedWorkId();
    if (!workId) return;
    this.workService.setWorkStatus(workId, status).subscribe({
      next: () => this.close(),
      error: (err) => console.error('[DebugFab] setWorkStatus error:', err),
    });
  }

  getStatusLabel(status: WorkStatus): string {
    const labels: Record<WorkStatus, string> = {
      CREDIT_PENDING: 'Crédito pendiente',
      CREDIT_APPROVED: 'Crédito aprobado',
      TECHNICAL_VISIT_PENDING: 'Visita pendiente',
      TECHNICAL_VISIT: 'Visita técnica',
      WAITING_PARTNERS: 'Esperando proveedores',
      IN_PROGRESS: 'En curso',
    };
    return labels[status] ?? status;
  }

  workLabel(work: Work): string {
    const shortId = work.id.slice(0, 8);
    return `${shortId}… ${work.userEmail ?? work.status}`;
  }

  getButtonClass(status: WorkStatus): string {
    const base = 'px-3 py-2 rounded-xl text-xs font-bold transition-colors text-white';
    switch (status) {
      case 'CREDIT_APPROVED':
        return `${base} bg-emerald-500 hover:bg-emerald-600`;
      case 'TECHNICAL_VISIT_PENDING':
        return `${base} bg-amber-500 hover:bg-amber-600`;
      case 'WAITING_PARTNERS':
        return `${base} bg-amber-500 hover:bg-amber-600`;
      case 'IN_PROGRESS':
        return `${base} bg-slate-600 hover:bg-slate-700`;
      default:
        return `${base} bg-slate-400 hover:bg-slate-500`;
    }
  }
}
