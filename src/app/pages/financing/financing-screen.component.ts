import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Zap, TrendingUp, Star, Check, Calculator, DollarSign, CreditCard } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import type { FigmaFinancingPlan } from '../../models/figma-ui.types';
import type { FinancingPlanConfig } from '../../services/config.service';

/** Estilos por plan id (icon, colores). Si el backend no los envía, se usan estos. */
const PLAN_UI: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  express: { icon: 'Zap', color: 'from-yellow-500 to-[#FF5500]', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  standard: { icon: 'TrendingUp', color: 'from-[#FF5500] to-[#FF6600]', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
  expanded: { icon: 'Star', color: 'from-[#FF6600] to-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
};

const FALLBACK_PLANS: FigmaFinancingPlan[] = [
  { id: 'express', name: 'RENOEXPRESS', icon: 'Zap', range: '$200 - $500', minAmount: 200, maxAmount: 500, color: 'from-yellow-500 to-[#FF5500]', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', description: 'Servicios rápidos para reparaciones menores y proyectos express.', features: ['Aprobación en 24 horas', 'Ideal para reparaciones urgentes', 'Sin cargos ocultos'] },
  { id: 'standard', name: 'RENOSTANDAR', icon: 'TrendingUp', range: '$500 - $1,000', minAmount: 500, maxAmount: 1000, color: 'from-[#FF5500] to-[#FF6600]', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', description: 'Para proyectos de tamaño mediano que requieren planificación.', features: ['Aprobación rápida', 'Planificación coordinada', 'Seguimiento personalizado'] },
  { id: 'expanded', name: 'RENOAMPLIADO', icon: 'Star', range: '$1,000 - $1,500', minAmount: 1000, maxAmount: 1500, color: 'from-[#FF6600] to-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300', description: 'Proyectos grandes y de alta complejidad con atención especializada.', features: ['Atención prioritaria', 'Expertos especializados', 'Garantía extendida'] },
];

function configToFigma(p: FinancingPlanConfig): FigmaFinancingPlan {
  const ui = PLAN_UI[p.id] ?? { icon: 'CreditCard', color: 'from-slate-500 to-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-300' };
  return {
    id: p.id,
    name: p.name,
    icon: ui.icon,
    range: `$${p.minAmount} - $${p.maxAmount}`,
    minAmount: p.minAmount,
    maxAmount: p.maxAmount,
    color: ui.color,
    bgColor: ui.bgColor,
    borderColor: ui.borderColor,
    description: p.description ?? '',
    features: p.features ?? [],
  };
}

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
  private configService = inject(ConfigService);

  selectedPlanId = signal<string | null>(null);
  amount = signal<number | null>(null);
  installments = signal<number>(3);
  showSimulator = signal(false);

  readonly icons = { ArrowLeft, Zap, TrendingUp, Star, Check, Calculator, DollarSign, CreditCard };

  /** Planes desde config (GET /config/public) o fallback local. */
  financingPlans = computed<FigmaFinancingPlan[]>(() => {
    const plans = this.configService.catalog()?.financingPlans;
    if (plans?.length) return plans.map(configToFigma);
    return FALLBACK_PLANS;
  });

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
    return this.financingPlans().find((p) => p.id === id) ?? null;
  });

  selectPlan(planId: string) {
    const plan = this.financingPlans().find((p) => p.id === planId);
    this.selectedPlanId.set(planId);
    if (plan && this.amount() === null) this.amount.set(plan.minAmount);
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
