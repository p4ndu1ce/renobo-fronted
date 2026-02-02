import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { CreditPlanId } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { WorkService } from '../../services/work.service';

export interface CreditPlanOption {
  id: CreditPlanId;
  name: string;
  amount: number;
  shortLabel: string;
}

@Component({
  selector: 'app-plan-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-selection.component.html',
  styleUrl: './plan-selection.component.css',
})
export class PlanSelectionComponent {
  private router = inject(Router);
  public authService = inject(AuthService);
  private workService = inject(WorkService);

  /** Teléfono del usuario (CurrentUser no tiene phone; se muestra — si no existe). */
  getCurrentUserPhone(): string {
    const user = this.authService.currentUser();
    return (user && (user as { phone?: string }).phone) ? (user as { phone?: string }).phone! : '—';
  }

  readonly plans: CreditPlanOption[] = [
    { id: 'BRONZE', name: 'Bronce', amount: 1_000, shortLabel: '$1k' },
    { id: 'SILVER', name: 'Plata', amount: 5_000, shortLabel: '$5k' },
    { id: 'GOLD', name: 'Oro', amount: 15_000, shortLabel: '$15k' },
  ];

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

    const plan = this.plans.find((p) => p.id === planId);
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
