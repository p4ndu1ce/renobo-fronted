import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';
import type { CreditPlanId } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { WorkService } from '../../services/work.service';
import { ConfigService, type CreditPlan } from '../../services/config.service';

export interface CreditPlanOption {
  id: CreditPlanId;
  name: string;
  amount: number;
  shortLabel: string;
}

/** Mapea plan del config a BRONZE/SILVER/GOLD por monto (compatibilidad con backend y getPlanLabel). */
function mapPlanToOption(plan: CreditPlan, index: number): CreditPlanOption {
  const amount = plan.maxAmount ?? plan.minAmount ?? 0;
  let id: CreditPlanId = 'BRONZE';
  if (amount > 5000) id = 'GOLD';
  else if (amount > 1000) id = 'SILVER';
  else id = 'BRONZE';
  const shortLabel = amount >= 1000 ? `$${amount / 1000}k` : `$${amount}`;
  return { id, name: plan.name, amount, shortLabel };
}

const FALLBACK_PLANS: CreditPlanOption[] = [
  { id: 'BRONZE', name: 'Bronce', amount: 1_000, shortLabel: '$1k' },
  { id: 'SILVER', name: 'Plata', amount: 5_000, shortLabel: '$5k' },
  { id: 'GOLD', name: 'Oro', amount: 15_000, shortLabel: '$15k' },
];

@Component({
  selector: 'app-plan-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingButtonComponent],
  templateUrl: './plan-selection.component.html',
  styleUrl: './plan-selection.component.css',
})
export class PlanSelectionComponent {
  private router = inject(Router);
  public authService = inject(AuthService);
  private workService = inject(WorkService);
  private configService = inject(ConfigService);

  /** Teléfono del usuario (CurrentUser no tiene phone; se muestra — si no existe). */
  getCurrentUserPhone(): string {
    const user = this.authService.currentUser();
    return (user && (user as { phone?: string }).phone) ? (user as { phone?: string }).phone! : '—';
  }

  /** Planes desde config; si no hay catalog, se usan los por defecto. */
  plans = computed<CreditPlanOption[]>(() => {
    const catalog = this.configService.catalog();
    const creditPlans = catalog?.creditPlans;
    if (creditPlans?.length) {
      return creditPlans.map((p, i) => mapPlanToOption(p, i));
    }
    return FALLBACK_PLANS;
  });

  selectedPlanId = signal<CreditPlanId | null>(null);
  description = signal('');
  isSubmitting = signal(false);
  errorMessage = signal('');

  selectPlan(planId: CreditPlanId): void {
    this.selectedPlanId.set(planId);
    this.errorMessage.set('');
  }

  onSubmit(): void {
    const planId = this.selectedPlanId();
    const desc = this.description().trim();
    if (!planId) return;

    const plan = this.plans().find((p) => p.id === planId);
    if (!plan) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const userProfile = this.authService.userProfile();
    const user = this.authService.currentUser();
    const userContact = user
      ? {
          userName: user.name ?? undefined,
          userEmail: user.email ?? user.id ?? undefined,
          userPhone: (user as { phone?: string }).phone ?? undefined,
        }
      : undefined;
    const title = `Solicitud Plan ${plan.name}`;
    this.workService.createCreditRequest(planId, plan.amount, title, desc || 'Sin descripción', userProfile, userContact).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error ?? err.message ?? 'Error al enviar la solicitud.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
