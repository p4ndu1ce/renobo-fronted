import { Component, inject, OnInit, OnDestroy, computed, signal, PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WorkService, type Work, type CreditPlanId } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';

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

  /** Mensaje de éxito tras redirección (ej. "Solicitud enviada a proveedores"). */
  successMessage = signal<string | null>(null);

  /** Obras pendientes de visita técnica (TECHNICAL_VISIT_PENDING) asignadas al ingeniero actual. */
  assignedWorks = computed(() => {
    const works = this.workService.works();
    const myId = this.authService.engineerId();
    if (!myId) return [];
    return works
      .filter(w => w.engineerId === myId && w.status === 'TECHNICAL_VISIT_PENDING')
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

  /** Descripción de la obra (description o descripcion legacy). */
  getWorkDescription(work: Work): string {
    const d = work.description ?? (work as { descripcion?: string }).descripcion;
    return d?.trim() || '—';
  }

  selectWork(work: Work): void {
    this.selectedWorkId.update(current => (current === work.id ? null : work.id));
  }

  /** Navega a la calculadora técnica para esta obra (relevamiento). */
  startRelevamiento(work: Work): void {
    this.router.navigate(['/engineer/visit', work.id]);
  }
}
