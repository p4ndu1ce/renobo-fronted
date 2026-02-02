import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyPipe } from '@angular/common';
import { type Work, type CreditPlanId } from '../../../services/work.service';
import { PartnerService } from '../../../services/partner.service';
import { ConfigService } from '../../../services/config.service';

export interface MaterialGroupByPartner {
  partnerId: string;
  partnerName: string;
  status: 'PENDING' | 'CONFIRMED' | 'UNAVAILABLE';
  items: { name: string; quantity: number; price: number; unit: string }[];
}

/**
 * Resumen de materiales para el cliente: lista agrupada por partner,
 * estado de confirmación y resumen financiero (total invertido, saldo del plan).
 * Estética: fondo crema #fff9f3, tarjetas blancas, bordes redondeados.
 */
@Component({
  selector: 'app-client-material-summary',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './client-material-summary.component.html',
  styleUrl: './client-material-summary.component.css',
})
export class ClientMaterialSummaryComponent {
  private partnerService = inject(PartnerService);
  private configService = inject(ConfigService);

  /** Obra actual (con items, partnerResponses, planAmount, title). */
  work = input<Work | null>(null);
  /** Nombre del ingeniero que realizó la visita. */
  engineerName = input<string | null>(null);

  /** Grupos de materiales por partner (nombre, estado, ítems con nombre y cantidad). */
  groupsByPartner = computed(() => {
    const w = this.work();
    const items = w?.items ?? [];
    if (items.length === 0) return [];
    const services = this.configService.catalog()?.services ?? [];
    const responses = w?.partnerResponses ?? {};
    const byPartner = new Map<string, MaterialGroupByPartner>();
    for (const item of items) {
      const pid = item.partnerId || '—';
      if (!byPartner.has(pid)) {
        const partner = this.partnerService.getPartnerById(pid);
        const status = (responses[pid] ?? 'PENDING') as 'PENDING' | 'CONFIRMED' | 'UNAVAILABLE';
        byPartner.set(pid, {
          partnerId: pid,
          partnerName: partner?.name ?? pid,
          status,
          items: [],
        });
      }
      const service = services.find((s) => s.id === item.materialId);
      const name = item.name ?? service?.name ?? item.materialId;
      const unit = service?.unit ?? 'u';
      byPartner.get(pid)!.items.push({
        name,
        quantity: item.quantity,
        price: item.price ?? 0,
        unit,
      });
    }
    return Array.from(byPartner.values());
  });

  /** Total invertido (suma de precio × cantidad). */
  totalInvertido = computed(() => {
    const w = this.work();
    const items = w?.items ?? [];
    return items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
  });

  /** Monto del plan (Bronce/Plata/Oro). */
  planAmount = computed(() => this.work()?.planAmount ?? 0);

  /** Saldo disponible del plan (planAmount - totalInvertido). */
  saldoPlan = computed(() => Math.max(0, this.planAmount() - this.totalInvertido()));

  getPlanLabel(planId?: CreditPlanId | string | null): string {
    if (!planId) return '—';
    const labels: Record<string, string> = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' };
    return labels[planId] ?? planId;
  }

  /** Badge de estado: texto y clase. */
  getStatusBadge(status: string): { text: string; icon: string; class: string } {
    switch (status) {
      case 'CONFIRMED':
        return { text: 'Disponible', icon: '✅', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'UNAVAILABLE':
        return { text: 'No disponible', icon: '❌', class: 'bg-slate-100 text-slate-600 border-slate-200' };
      default:
        return { text: 'Confirmando stock', icon: '⏳', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  }
}
