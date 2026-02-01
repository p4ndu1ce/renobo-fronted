import { Component, inject, OnInit, OnDestroy, computed, signal, PLATFORM_ID } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { WorkService, type Work, type CreditPlanId } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';

const PARTNER_DEADLINE_HOURS = 48;
const PARTNER_URGENT_HOURS = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export interface PartnerDeadlineInfo {
  text: string;
  expired: boolean;
  percentRemaining: number;
  /** true cuando faltan menos de 12h (contador en rojo). */
  urgent: boolean;
}

@Component({
  selector: 'app-engineer-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './engineer-dashboard.component.html',
  styleUrl: './engineer-dashboard.component.css'
})
export class EngineerDashboardComponent implements OnInit, OnDestroy {
  public workService = inject(WorkService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  /** Mensaje de éxito tras redirección (ej. "Solicitud enviada a proveedores"). */
  successMessage = signal<string | null>(null);

  /** Actualización cada minuto para que el countdown se refresque. */
  now = signal(Date.now());

  /** Obras con crédito aprobado o esperando partners, asignadas al ingeniero actual. */
  assignedWorks = computed(() => {
    this.now(); // dependencia para re-evaluar cada minuto
    const works = this.workService.works();
    const myId = this.authService.engineerId();
    if (!myId) return [];
    return works.filter(
      w => (w.status === 'CREDIT_APPROVED' || w.status === 'WAITING_PARTNERS') && w.engineerId === myId
    ).map(w => ({
      ...w,
      planLabel: this.getPlanLabel(w.planId),
      deadlineInfo: w.status === 'WAITING_PARTNERS' ? this.getPartnerDeadlineRemaining(w) : null
    }));
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.workService.getAllWorks();
      this.tickInterval = setInterval(() => this.now.set(Date.now()), 60_000);
      const success = this.route.snapshot.queryParamMap.get('success');
      if (success === 'solicitud-enviada') {
        this.successMessage.set('Solicitud de disponibilidad enviada a los proveedores correctamente.');
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '', replaceUrl: true });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  /**
   * Calcula cuánto tiempo queda del plazo (48h) desde que se envió la solicitud al partner.
   * Usa partnerResponseDeadline o partnerConfirmationDeadline si existe; si no, estima desde createdAt + 48h.
   */
  getPartnerDeadlineRemaining(work: Work): PartnerDeadlineInfo {
    const nowMs = this.now();
    let deadlineMs: number;
    let startMs: number;
    const deadlineStr = work.partnerResponseDeadline ?? work.partnerConfirmationDeadline;
    if (deadlineStr) {
      deadlineMs = new Date(deadlineStr).getTime();
      startMs = deadlineMs - (PARTNER_DEADLINE_HOURS / 24) * MS_PER_DAY;
    } else {
      startMs = new Date(work.createdAt).getTime();
      deadlineMs = startMs + (PARTNER_DEADLINE_HOURS / 24) * MS_PER_DAY;
    }
    const totalMs = deadlineMs - startMs;
    const remainingMs = Math.max(0, deadlineMs - nowMs);
    const expired = nowMs >= deadlineMs;
    const percentRemaining = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
    const urgent = !expired && remainingMs < PARTNER_URGENT_HOURS * MS_PER_HOUR;
    const text = expired ? 'Plazo vencido' : this.getTimeLeft(remainingMs);
    return { text, expired, percentRemaining, urgent };
  }

  /** Formato del tiempo restante: "Faltan Xh Ym" (referencia del timer). */
  private getTimeLeft(remainingMs: number): string {
    if (remainingMs <= 0) return 'Plazo vencido';
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Faltan ${hours}h ${minutes}m`;
  }

  getPlanLabel(planId?: CreditPlanId | null): string {
    if (!planId) return '—';
    const labels: Record<CreditPlanId, string> = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' };
    return labels[planId] ?? planId;
  }

  startTechnicalVisit(work: Work): void {
    this.router.navigate(['/engineer/visit', work.id]);
  }
}
