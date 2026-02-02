import { Component, inject, OnInit, computed, signal, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { WorkService, type Work, type CreditPlanId, type WorkStatus } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { EngineerService } from '../../services/engineer.service';
import { ToastService } from '../../services/toast.service';

export type AdminFilter = 'all' | 'pending_approval' | 'approved_no_engineer' | 'rejected';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  public workService = inject(WorkService);
  public authService = inject(AuthService);
  public engineerService = inject(EngineerService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private toastService = inject(ToastService);

  /** ID de la obra seleccionada en el drawer. Null cuando el drawer está cerrado. */
  selectedWorkId = signal<string | null>(null);

  /** Obra actual del drawer (derivada de works para que al aprobar se actualice y muestre Asignar ingeniero). */
  selectedWork = computed(() => {
    const id = this.selectedWorkId();
    if (!id) return null;
    return this.workService.works().find(w => w.id === id) ?? null;
  });

  /** Ingeniero seleccionado para la obra actual (drawer). */
  selectedEngineerId = signal<string | null>(null);

  /** Motivo de rechazo (input en el panel de detalle). */
  rejectionReason = signal('');

  searchTerm = signal('');
  filterStatus = signal<AdminFilter>('all');

  works = computed(() => {
    return this.workService.works().map(work => ({
      ...work,
      planIdDisplay: this.getPlanLabel(work.planId),
      score: work.financialProfile?.score ?? (work as { userProfile?: { score?: number } }).userProfile?.score ?? null,
      statusDisplay: this.mapStatusToTemplate(work.status)
    }));
  });

  filteredWorks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const statusFilter = this.filterStatus();
    let list = this.works();

    if (statusFilter === 'pending_approval') {
      list = list.filter(w => w.statusDisplay === 'PENDING');
    } else if (statusFilter === 'approved_no_engineer') {
      list = list.filter(w => w.statusDisplay === 'APPROVED' && !w.engineerId);
    } else if (statusFilter === 'rejected') {
      list = list.filter(w => w.statusDisplay === 'REJECTED');
    }

    if (!term) return list;
    return list.filter(work => {
      const idMatch = work.id.toLowerCase().includes(term);
      const titleMatch = (work.title ?? '').toLowerCase().includes(term);
      const emailMatch = (work.userId ?? '').toLowerCase().includes(term);
      const planMatch = (work.planIdDisplay ?? '').toLowerCase().includes(term);
      const scoreMatch = String(work.score ?? '').includes(term);
      return idMatch || titleMatch || emailMatch || planMatch || scoreMatch;
    });
  });

  pendingCount = computed(() => {
    return this.workService.works().filter(w => this.mapStatusToTemplate(w.status) === 'PENDING').length;
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.workService.getAllWorks().subscribe();
      this.engineerService.getEngineers().subscribe();
    }
  }

  /**
   * Mapea el estado del backend al formato del template (PENDING / APPROVED / REJECTED / etc.).
   */
  private mapStatusToTemplate(status: WorkStatus): string {
    switch (status) {
      case 'CREDIT_PENDING':
        return 'PENDING';
      case 'CREDIT_APPROVED':
        return 'APPROVED';
      case 'REJECTED':
        return 'REJECTED';
      case 'TECHNICAL_VISIT_PENDING':
      case 'TECHNICAL_VISIT':
      case 'WAITING_PARTNERS':
      case 'IN_PROGRESS':
        return status;
      default:
        return status ?? 'PENDING';
    }
  }

  /** Etiqueta del plan para mostrar (Bronce / Plata / Oro). */
  getPlanLabel(planId?: CreditPlanId | string | null): string {
    if (!planId) return '—';
    const labels: Record<string, string> = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' };
    return labels[planId] ?? planId;
  }

  /** Clases CSS para el badge del plan (Bronce=ámbar, Plata=gris, Oro=dorado). */
  getPlanClass(planId?: CreditPlanId | string | null): string {
    switch (planId) {
      case 'BRONZE': return 'bg-amber-100 text-amber-800';
      case 'SILVER': return 'bg-slate-200 text-slate-800';
      case 'GOLD': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  /** Indica si el perfil del cliente es apto para crédito (score >= 60). */
  isAptoCredito(work: Work): boolean {
    const p = work.financialProfile;
    if (!p) return false;
    return p.score >= 60;
  }

  /** Indica si el score recomienda aprobar (score > 750). */
  isRecomendado(work: Work): boolean {
    const score = work.financialProfile?.score ?? (work as { userProfile?: { score?: number } }).userProfile?.score;
    return score != null && score > 750;
  }

  /** Estatus financiero para mostrar (AL DÍA / MOROSO / SIN ACTIVIDAD). */
  getFinancialStatusLabel(work: Work): string {
    const p = work.financialProfile;
    if (p?.status) return p.status;
    const up = (work as { userProfile?: { status?: string; isMoroso?: boolean } }).userProfile;
    if (up?.isMoroso) return 'MOROSO';
    if (up?.status) return up.status === 'ATRASADO' ? 'MOROSO' : up.status === 'SIN HISTORIAL' ? 'SIN ACTIVIDAD' : 'AL DÍA';
    return '—';
  }

  /** Descripción de la obra (description o descripcion legacy). */
  getWorkDescription(work: Work): string {
    const d = work.description ?? (work as { descripcion?: string }).descripcion;
    return d?.trim() || '—';
  }

  /** Score para mostrar en el panel (financialProfile o userProfile). */
  getWorkScoreDisplay(work: Work): string | number {
    const score = work.financialProfile?.score ?? (work as { userProfile?: { score?: number } }).userProfile?.score;
    return score ?? '—';
  }

  /**
   * Obtiene las clases CSS para el badge de estado
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
      case 'CREDIT_APPROVED':
        return 'bg-emerald-100 text-emerald-700';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-700';
      case 'PENDING':
      case 'TECHNICAL_VISIT_PENDING':
      case 'TECHNICAL_VISIT':
      case 'WAITING_PARTNERS':
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  /**
   * Aprueba la solicitud de crédito (estado CREDIT_APPROVED). Mantiene el panel abierto y muestra
   * la sección "Asignar ingeniero" para esa misma obra (ciclo en un solo paso).
   */
  approve(workId: string): void {
    this.workService.updateWorkStatus(workId, 'CREDIT_APPROVED');
    this.toastService.show('Crédito aprobado. Asigna un ingeniero a continuación.', 'success');
    // No cerramos el drawer: selectedWork se actualiza desde workService.works() y el panel muestra "Asignar ingeniero"
  }

  /**
   * Rechaza la solicitud (estado REJECTED). Pide motivo breve y actualiza.
   */
  reject(workId: string): void {
    const fromInput = this.rejectionReason().trim();
    const fromPrompt = prompt('Motivo breve de rechazo (opcional):');
    const reason = fromInput || (fromPrompt ?? '');
    this.workService.updateWorkStatus(workId, 'REJECTED', reason || undefined);
    this.rejectionReason.set('');
    this.closeDrawer();
  }

  /** Asigna la obra al drawer y lo abre. */
  selectWork(work: Work): void {
    this.selectedWorkId.set(work.id);
    this.selectedEngineerId.set(null);
    this.rejectionReason.set('');
  }

  /** Cierra el panel de auditoría. */
  closeDrawer(): void {
    this.selectedWorkId.set(null);
    this.selectedEngineerId.set(null);
  }

  /** Selecciona un ingeniero para asignar a la obra. */
  selectEngineer(engineerId: string | null): void {
    this.selectedEngineerId.set(engineerId);
  }

  /** Confirma la asignación del ingeniero seleccionado (status TECHNICAL_VISIT_PENDING). */
  confirmAndAssignEngineer(workId: string): void {
    const engineerId = this.selectedEngineerId();
    if (!engineerId) {
      alert('Selecciona un ingeniero antes de confirmar.');
      return;
    }
    if (confirm('¿Asignar esta obra al ingeniero seleccionado?')) {
      this.workService.assignEngineer(workId, engineerId);
      this.closeDrawer();
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
