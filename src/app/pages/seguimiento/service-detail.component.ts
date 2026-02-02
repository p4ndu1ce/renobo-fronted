import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { EngineerService } from '../../services/engineer.service';
import { ClientMaterialSummaryComponent } from './client-material-summary/client-material-summary.component';
import type { Work, WorkStatus } from '../../services/work.service';

/** Pasos del stepper de seguimiento (orden fijo). */
const TRACKING_STEPS: { key: WorkStatus | string; label: string }[] = [
  { key: 'CREDIT_PENDING', label: 'Crédito Solicitado' },
  { key: 'CREDIT_APPROVED', label: 'Aprobado' },
  { key: 'TECHNICAL_VISIT_PENDING', label: 'Visita Técnica' },
  { key: 'WAITING_PARTNERS', label: 'Pedido de Materiales' },
  { key: 'IN_PROGRESS', label: 'En Curso' },
];

/** Orden lógico para saber en qué índice está el estado actual. */
const STATUS_INDEX: Record<string, number> = {
  CREDIT_PENDING: 0,
  CREDIT_APPROVED: 1,
  TECHNICAL_VISIT_PENDING: 2,
  TECHNICAL_VISIT: 2,
  WAITING_PARTNERS: 3,
  IN_PROGRESS: 4,
};

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ClientMaterialSummaryComponent],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.css',
})
export class ServiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workService = inject(WorkService);
  private authService = inject(AuthService);
  private engineerService = inject(EngineerService);

  workId = signal<string | null>(null);
  loading = signal(true);

  /** Obra actual (desde myWorks por workId de query). */
  work = computed(() => {
    const id = this.workId();
    if (!id) return null;
    return this.workService.myWorks().find((w) => w.id === id) ?? null;
  });

  /** Pasos para el stepper con estado completado/actual. */
  steps = computed(() => {
    const w = this.work();
    const currentIndex = w ? STATUS_INDEX[w.status] ?? 0 : 0;
    return TRACKING_STEPS.map((step, index) => ({
      label: step.label,
      completed: index < currentIndex,
      current: index === currentIndex,
    }));
  });

  /** Nombre del ingeniero asignado (si hay engineerId). */
  engineerName = computed(() => {
    const w = this.work();
    if (!w?.engineerId) return null;
    const list = this.engineerService.engineers();
    const eng = list.find((e) => e.id === w.engineerId);
    return eng?.name ?? w.engineerId;
  });

  /** Fecha estimada: plazo de materiales o "Por definir". */
  estimatedDate = computed(() => {
    const w = this.work();
    if (!w) return null;
    if (w.partnerDeadline) return w.partnerDeadline;
    return null;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['workId'] ?? null;
      this.workId.set(id);
    });

    const user = this.authService.currentUser();
    const userId = user?.email ?? user?.id;
    if (userId) {
      this.workService.getUserWorks(userId).subscribe({
        next: () => {},
        error: () => {},
        complete: () => this.loading.set(false),
      });
      this.engineerService.getEngineers().subscribe();
    } else {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/servicios']);
  }
}
