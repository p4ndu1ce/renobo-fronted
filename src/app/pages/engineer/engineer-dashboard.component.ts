import { Component, inject, OnInit, OnDestroy, computed, signal, PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { WorkService, type Work, type CreditPlanId } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';

@Component({
  selector: 'app-engineer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, LoadingButtonComponent],
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

  readonly icons = { ArrowLeft };

  /** Mensaje de éxito tras redirección (ej. "Solicitud enviada a proveedores"). */
  successMessage = signal<string | null>(null);
  /** true mientras se envía "Finalizar obra". */
  isFinishingWork = signal(false);

  /** Obras asignadas al ingeniero: pendientes de visita, esperando partners o en curso (misma fuente que Home "visitas programadas"). */
  assignedWorks = computed(() => {
    const works = this.workService.works();
    const myId = this.authService.engineerId();
    if (!myId) return [];
    return works
      .filter(w =>
        w.engineerId === myId &&
        (w.status === 'TECHNICAL_VISIT_PENDING' || w.status === 'TECHNICAL_VISIT' || w.status === 'WAITING_PARTNERS' || w.status === 'IN_PROGRESS')
      )
      .map(w => ({ ...w, planLabel: this.getPlanLabel(w.planId) }));
  });

  /** Servicios asignados sin visita agendada aún. */
  worksWithoutVisit = computed(() =>
    this.assignedWorks()
      .filter(w => w.status === 'TECHNICAL_VISIT_PENDING' && !(w as { requestedScheduledDate?: string }).requestedScheduledDate)
  );

  /** Servicios con visita agendada (muestra fecha y hora). */
  worksWithVisit = computed(() =>
    this.assignedWorks()
      .filter(w => (w as { requestedScheduledDate?: string }).requestedScheduledDate)
  );

  /** Inputs para agendar (por workId). */
  visitDateByWork = signal<Record<string, string>>({});
  visitTimeByWork = signal<Record<string, string>>({});

  setVisitDate(workId: string, value: string) {
    this.visitDateByWork.update((m) => ({ ...m, [workId]: value }));
  }
  setVisitTime(workId: string, value: string) {
    this.visitTimeByWork.update((m) => ({ ...m, [workId]: value }));
  }

  formatScheduled(dt?: string): string {
    if (!dt) return '—';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return dt;
    return d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /** Fecha de creación para la lista (estilo tracking). */
  formatWorkDate(work: Work): string {
    const createdAt = work.createdAt;
    if (!createdAt) return '—';
    return new Date(createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  openChat(work: Work): void {
    const clientName = work.userName ?? work.userEmail ?? work.userId ?? 'Cliente';
    this.router.navigate(['/chat'], { state: { workId: work.id, engineerName: clientName } });
  }

  scheduleVisit(work: Work): void {
    const date = this.visitDateByWork()[work.id]?.trim();
    const time = this.visitTimeByWork()[work.id]?.trim();
    if (!date || !time) {
      this.toastService.show('Selecciona fecha y hora para agendar la visita.', 'error');
      return;
    }
    const iso = new Date(`${date}T${time}:00`).toISOString();
    this.workService.scheduleTechnicalVisit(work.id, iso).subscribe({
      next: () => this.toastService.show('Visita agendada correctamente.', 'success'),
      error: (err) => this.toastService.show(err?.error?.error ?? 'Error al agendar la visita.', 'error'),
    });
  }

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
    this.isFinishingWork.set(true);
    this.workService.finishWork(work.id).subscribe({
      next: () => {
        this.isFinishingWork.set(false);
        this.successMessage.set('Obra finalizada correctamente.');
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '', replaceUrl: true });
      },
      error: (err) => {
        this.isFinishingWork.set(false);
        this.toastService.show(err?.message ?? 'Error al finalizar la obra.', 'error');
      }
    });
  }
}
