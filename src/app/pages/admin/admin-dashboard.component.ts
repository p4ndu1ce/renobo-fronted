import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { WorkService, type Work } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  public workService = inject(WorkService);
  public authService = inject(AuthService);

  // Computed signal para obtener las obras con formato adaptado
  works = computed(() => {
    return this.workService.works().map(work => ({
      ...work,
      totalAmount: work.presupuestoInicial,
      planId: 'Por definir', // TODO: Obtener del planId cuando esté disponible
      status: this.mapStatusToTemplate(work.estado)
    }));
  });

  // Computed signal para contar obras pendientes
  pendingCount = computed(() => {
    return this.works().filter(work => work.status === 'PENDING').length;
  });

  ngOnInit(): void {
    // Cargar todas las obras al inicializar el componente
    this.workService.getAllWorks();
  }

  /**
   * Mapea el estado del backend al formato del template
   */
  private mapStatusToTemplate(estado: Work['estado']): string {
    switch (estado) {
      case 'OPEN':
        return 'PENDING';
      case 'APPROVED':
        return 'APPROVED';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return estado;
    }
  }

  /**
   * Obtiene las clases CSS para el badge de estado
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-700';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  /**
   * Aprueba una obra
   */
  approve(workId: string): void {
    if (confirm(`¿Estás seguro de aprobar la solicitud #${workId.slice(0, 8)}?`)) {
      this.workService.updateWorkStatus(workId, 'APPROVED');
    }
  }

  /**
   * Rechaza una obra
   */
  reject(workId: string): void {
    if (confirm(`¿Estás seguro de rechazar la solicitud #${workId.slice(0, 8)}?`)) {
      this.workService.updateWorkStatus(workId, 'REJECTED');
    }
  }
}
