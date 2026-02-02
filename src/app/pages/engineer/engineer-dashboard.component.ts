import { Component, inject, OnInit, OnDestroy, computed, signal, PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WorkService, type Work, type CreditPlanId } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-engineer-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './engineer-dashboard.component.html',
  styleUrl: './engineer-dashboard.component.css'
})
export class EngineerDashboardComponent implements OnInit, OnDestroy {
  public workService = inject(WorkService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private toastService = inject(ToastService);

  /** Mensaje de éxito tras redirección (ej. "Solicitud enviada a proveedores"). */
  successMessage = signal<string | null>(null);

  /** Obras asignadas al ingeniero: pendientes de visita, esperando partners o en curso (misma fuente que Home "visitas programadas"). */
  assignedWorks = computed(() => {
    const works = this.workService.works();
    const myId = this.authService.engineerId();
    if (!myId) return [];
    return works
      .filter(w =>
        w.engineerId === myId &&
        (w.status === 'TECHNICAL_VISIT_PENDING' || w.status === 'WAITING_PARTNERS' || w.status === 'IN_PROGRESS')
      )
      .map(w => ({ ...w, planLabel: this.getPlanLabel(w.planId) }));
  });

  /** Obra seleccionada para ver detalle e "Intención del Cliente". */
  selectedWorkId = signal<string | null>(null);
  selectedWork = computed(() => {
    const id = this.selectedWorkId();
    if (!id) return null;
    return this.workService.works().find(w => w.id === id) ?? null;
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const myId = this.authService.engineerId();
      if (myId) {
        this.workService.getWorksByEngineerId(myId).subscribe();
      }
      const success = this.route.snapshot.queryParamMap.get('success');
      if (success === 'solicitud-enviada') {
        this.successMessage.set('Solicitud de disponibilidad enviada a los proveedores correctamente.');
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '', replaceUrl: true });
      } else if (success === 'obra-iniciada') {
        this.successMessage.set('Obra iniciada correctamente. Estado: En curso.');
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '', replaceUrl: true });
      }
    }
  }

  ngOnDestroy(): void {}

  getPlanLabel(planId?: CreditPlanId | null): string {
    if (!planId) return '—';
    const labels: Record<CreditPlanId, string> = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' };
    return labels[planId] ?? planId;
  }

  /** Etiqueta de estado para el ingeniero (visita pendiente, esperando proveedores, en curso). */
  getStatusLabel(status: Work['status']): string {
    const labels: Record<string, string> = {
      TECHNICAL_VISIT_PENDING: 'Visita pendiente',
      WAITING_PARTNERS: 'Esperando proveedores',
      IN_PROGRESS: 'En curso',
    };
    return labels[status] ?? status;
  }

  /** Descripción de la obra (description o descripcion legacy). */
  getWorkDescription(work: Work): string {
    const d = work.description ?? (work as { descripcion?: string }).descripcion;
    return d?.trim() || '—';
  }

  selectWork(work: Work): void {
    this.selectedWorkId.update(current => (current === work.id ? null : work.id));
  }

  /** Navega a la calculadora técnica para esta obra (relevamiento o checklist). */
  startRelevamiento(work: Work): void {
    this.router.navigate(['/engineer/visit', work.id]);
  }

  /** Marca la obra como finalizada (IN_PROGRESS → FINISHED). */
  finishWork(work: Work): void {
    if (work.status !== 'IN_PROGRESS') return;
    this.workService.finishWork(work.id).subscribe({
      next: () => {
        this.successMessage.set('Obra finalizada correctamente.');
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '', replaceUrl: true });
      },
      error: (err) => {
        this.toastService.show(err?.message ?? 'Error al finalizar la obra.', 'error');
      }
    });
  }
}
