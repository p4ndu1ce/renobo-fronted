import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Zap, TrendingUp, Star, Check, Calculator, DollarSign, CreditCard } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-financing-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './financing-screen.component.html',
  styleUrl: './financing-screen.component.css',
})
export class FinancingScreenComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  selectedPlanId = signal<string | null>(null);
  amount = signal<number | null>(null);
  installments = signal<number>(3);
  showSimulator = signal(false);

  readonly icons = { ArrowLeft, Zap, TrendingUp, Star, Check, Calculator, DollarSign, CreditCard };

  financingPlans = [
    { id: 'express', name: 'RENOEXPRESS', icon: 'Zap', range: '$200 - $500', min: 200, max: 500, color: 'from-yellow-500 to-[#FF5500]', description: 'Servicios rápidos para reparaciones menores.', features: ['Aprobación en 24h', 'Urgencias', 'Sin cargos ocultos'] },
    { id: 'standard', name: 'RENOSTANDAR', icon: 'TrendingUp', range: '$500 - $1,000', min: 500, max: 1000, color: 'from-[#FF5500] to-[#FF6600]', description: 'Proyectos medianos planificados.', features: ['Aprobación rápida', 'Coordinación', 'Seguimiento'] },
    { id: 'expanded', name: 'RENOAMPLIADO', icon: 'Star', range: '$1,000 - $1,500', min: 1000, max: 1500, color: 'from-[#FF6600] to-red-600', description: 'Alta complejidad y atención especializada.', features: ['Prioridad', 'Expertos', 'Garantía extendida'] },
  ];

  downPayment = computed(() => (this.amount() ?? 0) * 0.4);
  monthlyInstallment = computed(() => {
    const amt = this.amount() ?? 0;
    const down = this.downPayment();
    const financed = amt - down;
    const n = this.installments();
    return n > 0 ? financed / n : 0;
  });

  selectedPlan = computed(() => {
    const id = this.selectedPlanId();
    if (id == null) return null;
    return this.financingPlans.find((p) => p.id === id) ?? null;
  });

  selectPlan(planId: string) {
    const plan = this.financingPlans.find((p) => p.id === planId);
    this.selectedPlanId.set(planId);
    if (plan && this.amount() === null) this.amount.set(plan.min);
    this.showSimulator.set(true);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  requestFinancing() {
    this.auth.navigationData.set({
      plan: this.selectedPlanId(),
      amount: this.amount(),
      installments: this.installments(),
    });
    this.router.navigate(['/financing-form']);
  }
}
