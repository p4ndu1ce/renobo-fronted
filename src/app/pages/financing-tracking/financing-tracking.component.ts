import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ArrowLeft, CreditCard, Calendar, DollarSign, Tag } from 'lucide-angular';
import { FinancingService, type FinancingRequestListItem } from '../../services/financing.service';

const PLAN_NAMES: Record<string, string> = {
  express: 'RENOEXPRESS',
  standard: 'RENOSTANDAR',
  expanded: 'RENOAMPLIADO',
};

@Component({
  selector: 'app-financing-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './financing-tracking.component.html',
  styleUrl: './financing-tracking.component.css',
})
export class FinancingTrackingComponent implements OnInit {
  private router = inject(Router);
  private financingService = inject(FinancingService);

  requests = signal<FinancingRequestListItem[]>([]);
  loading = signal(true);

  readonly icons = { ArrowLeft, CreditCard, Calendar, DollarSign, Tag };

  getPlanName(planId: string): string {
    return PLAN_NAMES[planId] ?? planId ?? '—';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente de aprobación',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-green-500 text-white';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  formatDate(createdAt: string): string {
    if (!createdAt) return '—';
    return new Date(createdAt).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    this.financingService.getMyRequests().subscribe({
      next: (res) => this.requests.set(res.requests ?? []),
      error: () => this.requests.set([]),
      complete: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
