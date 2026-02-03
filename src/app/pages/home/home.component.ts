import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import type { CreditPlan } from '../../services/config.service';
import { WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';
import { WalletCardComponent } from '../../shared/components/wallet-card/wallet-card.component';
import type { WorkStatus, CreditPlanId } from '../../services/work.service';

export interface Categoria {
  nombre: string;
  icono: string;
  bg: string;
}

/** Opciones para Categoría de Servicio en el formulario de solicitud. */
export const SERVICE_CATEGORIES = [
  { value: '', label: 'Seleccione categoría' },
  { value: 'Remodelación', label: 'Remodelación' },
  { value: 'Electricidad', label: 'Electricidad' },
  { value: 'Plomería', label: 'Plomería' },
  { value: 'Pintura', label: 'Pintura' },
  { value: 'Otros', label: 'Otros' },
] as const;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonCardComponent, LoadingButtonComponent, WalletCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private workService = inject(WorkService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  public configService = inject(ConfigService);

  /** Opciones para el select Categoría de Servicio (expuesto en template). */
  readonly SERVICE_CATEGORIES = SERVICE_CATEGORIES;

  /** Rol del usuario (Director de Orquesta: solo se renderiza la vista del rol actual). */
  userRole = this.authService.userRole;

  /** true mientras se cargan los datos de la Lambda. */
  isLoading = signal(true);

  /** Plan seleccionado (objeto completo) para expandir la card (solo CLIENT). */
  selectedPlan = signal<CreditPlan | null>(null);

  /** Categoría de servicio (Remodelación, Electricidad, etc.). */
  serviceCategory = signal('');

  /** Descripción del trabajo (textarea). */
  workDescription = signal('');

  /** Presupuesto estimado por el usuario. */
  estimatedBudget = signal<number | null>(null);

  /** true mientras se envía la solicitud de crédito. */
  isSubmitting = signal(false);

  /** Planes desde DB (catalog.creditPlans). */
  clientPlans = computed(() => this.configService.catalog()?.creditPlans ?? []);

  recentWorks = computed(() => this.workService.myWorks().slice(0, 3));

  /** Balance cliente: crédito aprobado menos lo gastado (obras FINISHED). Fórmula: Credit_approved - sum(Material_Costs). Mock: planAmount aprobado - planAmount de obras finalizadas. */
  clientWalletBalance = computed(() => {
    const works = this.workService.myWorks();
    const approved = works.filter((w) => w.status !== 'REJECTED' && w.status !== 'CREDIT_PENDING');
    const totalApproved = approved.reduce((sum, w) => sum + (w.planAmount ?? 0), 0);
    const finished = works.filter((w) => w.status === 'FINISHED');
    const totalSpent = finished.reduce((sum, w) => sum + (w.planAmount ?? 0), 0);
    return Math.max(0, totalApproved - totalSpent);
  });

  /** Estados considerados "finalizados": con una obra en estos estados el usuario puede solicitar otra. */
  private static readonly TERMINAL_STATUSES = new Set<string>(['REJECTED', 'FINISHED']);

  /** Obra en curso del usuario (primera en myWorks que no esté en estado finalizado). Si existe, bloquea nueva solicitud. */
  currentWork = computed(() => {
    const works = this.workService.myWorks();
    return works.find((w) => !HomeComponent.TERMINAL_STATUSES.has(w.status)) ?? null;
  });

  /** Fases del stepper resumen en Home (Crédito → Visita Técnica → Obra). */
  private static readonly PHASES = [
    { key: 'credit', label: 'Crédito' },
    { key: 'visit', label: 'Visita Técnica' },
    { key: 'work', label: 'Obra' },
  ];

  /** Índice de fase según status (0 = Crédito, 1 = Visita Técnica, 2 = Obra). */
  private static readonly STATUS_PHASE_INDEX: Record<string, number> = {
    CREDIT_PENDING: 0,
    CREDIT_APPROVED: 0,
    TECHNICAL_VISIT_PENDING: 1,
    TECHNICAL_VISIT: 1,
    WAITING_PARTNERS: 2,
    IN_PROGRESS: 2,
  };

  /** Pasos del stepper para la obra actual (completed/current por fase). */
  currentWorkSteps = computed(() => {
    const work = this.currentWork();
    if (!work) return [];
    const currentIndex = HomeComponent.STATUS_PHASE_INDEX[work.status] ?? 0;
    return HomeComponent.PHASES.map((phase, index) => ({
      label: phase.label,
      completed: index < currentIndex,
      current: index === currentIndex,
    }));
  });

  /** Etiqueta del plan (Bronce, Plata, Oro) para mostrar en la tarjeta. */
  getPlanLabel(planId?: CreditPlanId | string | null): string {
    const labels: Record<string, string> = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' };
    return planId ? (labels[planId] ?? planId) : '—';
  }

  /** KPIs para SUPERVISOR: créditos pendientes de aprobar. */
  creditsPendingCount = computed(() =>
    this.workService.works().filter((w) => w.status === 'CREDIT_PENDING').length
  );

  /** KPIs para SUPERVISOR: obras aprobadas sin ingeniero asignado. */
  worksUnassignedCount = computed(() =>
    this.workService.works().filter((w) => w.status === 'CREDIT_APPROVED' && !w.engineerId).length
  );

  /** Visitas técnicas de hoy para ENGINEER (asignadas al usuario). */
  todayVisitsCount = computed(() => {
    const myId = this.authService.engineerId();
    if (!myId) return 0;
    return this.workService.works().filter(
      (w) =>
        (w.status === 'TECHNICAL_VISIT_PENDING' || w.status === 'WAITING_PARTNERS' || w.status === 'IN_PROGRESS') &&
        w.engineerId === myId
    ).length;
  });

  categorias: Categoria[] = [
    { nombre: 'Electricidad', icono: '💡', bg: 'bg-amber-50' },
    { nombre: 'Plomería', icono: '🔧', bg: 'bg-sky-50' },
    { nombre: 'Carpintería', icono: '🪚', bg: 'bg-amber-50' },
    { nombre: 'Pintura', icono: '🎨', bg: 'bg-purple-50' },
    { nombre: 'A/C', icono: '❄️', bg: 'bg-cyan-50' },
    { nombre: 'General', icono: '📦', bg: 'bg-slate-50' },
  ];

  /** Selecciona un plan (objeto completo) para expandir la card. Toggle si ya está seleccionado. Al expandir, limpia el formulario. */
  selectPlan(plan: CreditPlan): void {
    this.selectedPlan.update((current) => {
      const next = current?.id === plan.id ? null : plan;
      if (next) {
        this.serviceCategory.set('');
        this.workDescription.set('');
        this.estimatedBudget.set(null);
      }
      return next;
    });
  }

  /** Mapea plan.id a CreditPlanId para el backend (BRONZE | SILVER | GOLD). */
  mapPlanIdForApi(plan: CreditPlan): CreditPlanId {
    const id = plan.id?.toUpperCase?.() ?? '';
    if (id === 'BRONZE' || id === 'SILVER' || id === 'GOLD') return id as CreditPlanId;
    return 'BRONZE';
  }

  /** Muestra Toast por el botón Adjuntos. */
  onAttachmentsClick(): void {
    this.toastService.show('Próximamente: Carga de archivos multimedia', 'success');
  }

  /** Teléfono del usuario actual (CurrentUser no tiene phone; se muestra — si no existe). */
  getCurrentUserPhone(): string {
    const user = this.authService.currentUser();
    return (user && (user as { phone?: string }).phone) ? (user as { phone?: string }).phone! : '—';
  }

  /** Envía la solicitud de crédito (CREDIT_PENDING) con el plan y datos del formulario. Persiste nombre, email y teléfono para que el Supervisor los vea. */
  requestPlan(plan: CreditPlan): void {
    const userProfile = this.authService.userProfile();
    const user = this.authService.currentUser();
    const userContact = user
      ? {
          userName: user.name ?? undefined,
          userEmail: user.email ?? user.id ?? undefined,
          userPhone: (user as { phone?: string }).phone ?? undefined,
        }
      : undefined;
    const category = this.serviceCategory().trim();
    const desc = this.workDescription().trim();
    const budget = this.estimatedBudget();
    const planAmount = budget != null && budget > 0 ? budget : plan.maxAmount;
    const title = category ? `${category} · Presupuesto ${planAmount}` : `Presupuesto ${planAmount}`;
    const description = desc || 'Sin descripción del trabajo';
    this.isSubmitting.set(true);
    const planId = this.mapPlanIdForApi(plan);
    this.workService.createCreditRequest(planId, planAmount, title, description, userProfile, userContact).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.selectedPlan.set(null);
        this.workService.getUserWorks(this.authService.currentUser()?.email ?? this.authService.currentUser()?.id ?? '').subscribe();
        this.router.navigate(['/request-success'], { queryParams: { plan: plan.name } });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toastService.show('Error al enviar solicitud', 'error');
      },
    });
  }

  /** Timeout para no quedarse en loading si la API no responde (p. ej. en APK sin red). */
  private static readonly LOADING_TIMEOUT_MS = 8000;

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const role = this.authService.userRole();
    const userId = user?.email ?? user?.id;
    const engineerId = this.authService.engineerId();

    const done = () => this.isLoading.set(false);

    // Timeout: si la petición no responde (APK / servidor caído), mostrar la página de todos modos
    const timeoutId = setTimeout(done, HomeComponent.LOADING_TIMEOUT_MS);

    const onComplete = () => {
      clearTimeout(timeoutId);
      done();
    };

    if (role === 'SUPERVISOR') {
      this.workService.getAllWorks().subscribe({ next: () => {}, error: onComplete, complete: onComplete });
    } else if (role === 'ENGINEER' && engineerId) {
      this.workService.getWorksByEngineerId(engineerId).subscribe({ next: () => {}, error: onComplete, complete: onComplete });
    } else if (userId) {
      this.workService.getUserWorks(userId).subscribe({ next: () => {}, error: onComplete, complete: onComplete });
    } else {
      clearTimeout(timeoutId);
      done();
    }
  }

  getIconForCategory(category: string): string {
    const icons: Record<string, string> = {
      Pintura: '🎨',
      Electricidad: '⚡',
      Plomería: '🚰',
      General: '🏗️',
    };
    return icons[category] ?? '🛠️';
  }

  getStatusClass(status: WorkStatus | string): string {
    switch (status) {
      case 'CREDIT_APPROVED':
        return 'bg-emerald-100 text-emerald-700';
      case 'CREDIT_PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'TECHNICAL_VISIT_PENDING':
      case 'TECHNICAL_VISIT':
      case 'WAITING_PARTNERS':
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-700';
      case 'FINISHED':
      case 'APPROVED':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getStatusLabel(status: WorkStatus | string): string {
    const labels: Record<string, string> = {
      CREDIT_PENDING: 'Pendiente de crédito',
      CREDIT_APPROVED: 'Crédito aprobado',
      TECHNICAL_VISIT_PENDING: 'Visita pendiente de asignar',
      TECHNICAL_VISIT: 'Visita técnica',
      WAITING_PARTNERS: 'Esperando proveedores',
      IN_PROGRESS: 'En proceso',
      REJECTED: 'Rechazado',
      FINISHED: 'Finalizado',
      APPROVED: 'Aprobado',
    };
    return labels[status] ?? status;
  }
}
