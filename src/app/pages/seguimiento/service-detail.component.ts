import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { EngineerService } from '../../services/engineer.service';
import { ClientMaterialSummaryComponent } from './client-material-summary/client-material-summary.component';
import { LucideAngularModule, ArrowLeft, MapPin, Clock, Phone, MessageCircle, Star, CheckCircle2 } from 'lucide-angular';
import type { WorkStatus } from '../../services/work.service';

/** Pasos del stepper de seguimiento (orden fijo). */
const TRACKING_STEPS: { key: WorkStatus | string; label: string }[] = [
  { key: 'BUDGET_PENDING', label: 'Presupuesto elegido' },
  { key: 'CREDIT_PENDING', label: 'Crédito Solicitado' },
  { key: 'CREDIT_APPROVED', label: 'Aprobado' },
  { key: 'TECHNICAL_VISIT_PENDING', label: 'Visita Técnica' },
  { key: 'WAITING_PARTNERS', label: 'Pedido de Materiales' },
  { key: 'IN_PROGRESS', label: 'En Curso' },
];

/** Orden lógico para saber en qué índice está el estado actual. */
const STATUS_INDEX: Record<string, number> = {
  BUDGET_PENDING: 0,
  CREDIT_PENDING: 1,
  CREDIT_APPROVED: 2,
  TECHNICAL_VISIT_PENDING: 3,
  TECHNICAL_VISIT: 3,
  WAITING_PARTNERS: 4,
  IN_PROGRESS: 5,
  FINISHED: 5,
  REJECTED: 0,
};

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ClientMaterialSummaryComponent, LucideAngularModule],
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

  /** Historial de solicitudes de servicio (todas las obras del usuario, ordenadas por fecha, sin límite). */
  serviceHistory = computed(() => {
    const works = this.workService
      .myWorks()
      .map((w) => ({
        id: w.id,
        title: w.title ?? w.description ?? 'Solicitud de obra',
        status: this.getStatusLabel(w.status),
        date: w.createdAt ? new Date(w.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
        sortKey: w.createdAt ?? '',
      }))
      .sort((a, b) => (b.sortKey as string).localeCompare(a.sortKey as string));
    return works;
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

  /** Fecha y hora de la visita técnica (cuando el ingeniero la agendó). */
  visitScheduledDate = computed(() => {
    const w = this.work();
    const d = (w as { requestedScheduledDate?: string })?.requestedScheduledDate;
    return d && d.trim() ? d : null;
  });

  /** Porcentaje de progreso para la barra (estilo Figma). */
  progressPercentage = computed(() => {
    const w = this.work();
    if (!w) return 0;
    const idx = STATUS_INDEX[w.status] ?? 0;
    return (idx / (TRACKING_STEPS.length - 1)) * 100;
  });

  readonly icons = { ArrowLeft, MapPin, Clock, Phone, MessageCircle, Star, CheckCircle2 };

  /** Etiqueta legible del estado (para el badge). */
  getStatusLabel(status: WorkStatus | string): string {
    const labels: Record<string, string> = {
      BUDGET_PENDING: 'Presupuesto elegido',
      CREDIT_PENDING: 'Crédito Solicitado',
      CREDIT_APPROVED: 'Aprobado',
      TECHNICAL_VISIT_PENDING: 'Visita pendiente',
      TECHNICAL_VISIT: 'Visita técnica',
      WAITING_PARTNERS: 'Pedido de materiales',
      IN_PROGRESS: 'En proceso',
      REJECTED: 'Rechazado',
      FINISHED: 'Finalizado',
    };
    return labels[status] ?? String(status);
  }

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
    this.router.navigate(['/home']);
  }

  /** Navega al detalle de una obra (tracking con workId). */
  openWork(workId: string): void {
    this.router.navigate(['/tracking'], { queryParams: { workId } });
  }
}
