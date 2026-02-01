import { Component, inject, OnInit, computed, signal, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { WorkService, type Work, type CreditPlanId, type WorkStatus } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';

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
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  /** Obra seleccionada para el panel de auditoría (drawer). Null cuando el drawer está cerrado. */
  selectedWork = signal<any | null>(null);

  // Signal para el término de búsqueda
  searchTerm = signal('');

  // Signal para el filtro de estado
  filterStatus = signal<'all' | 'pending'>('all');

  // Computed signal para obtener las obras con formato adaptado (cliente, plan, score)
  works = computed(() => {
    return this.workService.works().map(work => ({
      ...work,
      planIdDisplay: this.getPlanLabel(work.planId),
      score: work.userProfile?.score ?? '—',
      status: this.mapStatusToTemplate(work.status)
    }));
  });

  // Computed signal para filtrar obras basándose en el término de búsqueda y el estado
  filteredWorks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const statusFilter = this.filterStatus();
    let allWorks = this.works();

    // Aplicar filtro de estado
    if (statusFilter === 'pending') {
      allWorks = allWorks.filter(work => work.status === 'PENDING');
    }

    // Aplicar filtro de búsqueda
    if (!term) {
      return allWorks;
    }

    return allWorks.filter(work => {
      const idMatch = work.id.toLowerCase().includes(term);
      const emailMatch = (work.userEmail ?? '').toLowerCase().includes(term);
      const planMatch = (work.planIdDisplay ?? '').toLowerCase().includes(term);
      const scoreMatch = String(work.score).includes(term);
      return idMatch || emailMatch || planMatch || scoreMatch;
    });
  });

  // Computed signal para contar obras pendientes (basado en las obras filtradas)
  pendingCount = computed(() => {
    return this.filteredWorks().filter(work => work.status === 'PENDING').length;
  });

  ngOnInit(): void {
    // Cargar obras solo en el navegador: en SSR no hay token (localStorage) y la petición daría 401
    if (isPlatformBrowser(this.platformId)) {
      this.workService.getAllWorks();
    }
  }

  /**
   * Mapea el estado del backend al formato del template (PENDING / APPROVED / REJECTED).
   */
  private mapStatusToTemplate(status: WorkStatus): string {
    switch (status) {
      case 'CREDIT_PENDING':
      case 'TECHNICAL_VISIT':
      case 'WAITING_PARTNERS':
      case 'IN_PROGRESS':
        return status === 'CREDIT_PENDING' ? 'PENDING' : status;
      case 'CREDIT_APPROVED':
        return 'APPROVED';
      default:
        return 'REJECTED';
    }
  }

  /** Etiqueta del plan para mostrar (Bronce / Plata / Oro). */
  getPlanLabel(planId?: CreditPlanId | null): string {
    if (!planId) return '—';
    const labels: Record<CreditPlanId, string> = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' };
    return labels[planId] ?? planId;
  }

  /** Indica si el perfil del cliente es apto para crédito (score >= 60 y no moroso). */
  isAptoCredito(work: Work): boolean {
    const p = work.userProfile;
    if (!p) return false;
    return p.score >= 60 && !p.isMoroso;
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
      case 'TECHNICAL_VISIT':
      case 'WAITING_PARTNERS':
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  /**
   * Aprueba la solicitud de crédito (estado CREDIT_APPROVED).
   */
  approve(workId: string): void {
    if (confirm(`¿Estás seguro de aprobar la solicitud #${workId.slice(0, 8)}?`)) {
      this.workService.updateWorkStatus(workId, 'CREDIT_APPROVED');
    }
  }

  reject(workId: string): void {
    if (confirm(`¿Estás seguro de rechazar la solicitud #${workId.slice(0, 8)}?`)) {
      this.workService.updateWorkStatus(workId, 'CREDIT_PENDING');
    }
  }

  /** Asigna la obra al drawer y lo abre. */
  selectWork(work: unknown): void {
    this.selectedWork.set(work);
  }

  /** Cierra el panel de auditoría. */
  closeDrawer(): void {
    this.selectedWork.set(null);
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
