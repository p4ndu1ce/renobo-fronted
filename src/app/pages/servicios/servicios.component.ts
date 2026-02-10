import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { PartnerService } from '../../services/partner.service';
import type { WorkStatus } from '../../services/work.service';

export interface Categoria {
  nombre: string;
  icono: string;
  bg: string;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.css',
})
export class ServiciosComponent implements OnInit {
  private router = inject(Router);
  public configService = inject(ConfigService);
  public workService = inject(WorkService);
  public authService = inject(AuthService);
  public partnerService = inject(PartnerService);

  searchTerm = signal('');

  /** Obras del usuario (para Servicios Recientes y comprobar plan aprobado). */
  recentWorks = computed(() => this.workService.myWorks() ?? []);

  /** true si el usuario tiene al menos una obra con crédito aprobado (puede solicitar nuevo servicio). */
  hasApprovedPlan = computed(() =>
    this.recentWorks().some((w) => w.status === 'CREDIT_APPROVED')
  );

  filteredServices = computed(() => {
    const all = this.configService.catalog()?.services ?? [];
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term)
    );
  });

  categorias: Categoria[] = [
    { nombre: 'Electricidad', icono: '💡', bg: 'bg-amber-50' },
    { nombre: 'Plomería', icono: '🔧', bg: 'bg-sky-50' },
    { nombre: 'Carpintería', icono: '🪚', bg: 'bg-amber-50' },
    { nombre: 'Pintura', icono: '🎨', bg: 'bg-purple-50' },
    { nombre: 'A/C', icono: '❄️', bg: 'bg-cyan-50' },
    { nombre: 'General', icono: '📦', bg: 'bg-slate-50' },
  ];

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const userId = user?.email ?? user?.id;
    if (userId) {
      this.workService.getUserWorks(userId).subscribe();
    }
  }

  goToSeguimiento(workId?: string): void {
    if (workId) {
      this.router.navigate(['/tracking'], { queryParams: { workId } });
    } else {
      this.router.navigate(['/tracking']);
    }
  }

  getStatusLabel(status: WorkStatus): string {
    const labels: Record<WorkStatus, string> = {
      BUDGET_PENDING: 'Presupuesto pendiente',
      CREDIT_PENDING: 'Pendiente de crédito',
      CREDIT_APPROVED: 'Crédito aprobado',
      REJECTED: 'Rechazado',
      TECHNICAL_VISIT_PENDING: 'Visita pendiente',
      TECHNICAL_VISIT: 'Visita técnica',
      WAITING_PARTNERS: 'Esperando proveedores',
      IN_PROGRESS: 'En curso',
      FINISHED: 'Finalizado',
    };
    return labels[status] ?? status;
  }

  getStatusClass(status: WorkStatus): string {
    switch (status) {
      case 'CREDIT_APPROVED':
        return 'bg-emerald-100 text-emerald-700';
      case 'BUDGET_PENDING':
      case 'CREDIT_PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'TECHNICAL_VISIT_PENDING':
      case 'TECHNICAL_VISIT':
      case 'WAITING_PARTNERS':
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700';
      case 'FINISHED':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }
}
