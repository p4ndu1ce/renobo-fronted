import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
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
  private router = inject(Router);

  // Signal para el término de búsqueda
  searchTerm = signal('');

  // Signal para el filtro de estado
  filterStatus = signal<'all' | 'pending'>('all');

  // Computed signal para obtener las obras con formato adaptado
  works = computed(() => {
    return this.workService.works().map(work => ({
      ...work,
      totalAmount: work.presupuestoInicial,
      planId: 'Por definir', // TODO: Obtener del planId cuando esté disponible
      status: this.mapStatusToTemplate(work.estado)
    }));
  });

  // Computed signal para filtrar obras basándose en el término de búsqueda y el estado
  filteredWorks = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const statusFilter = this.filterStatus();
    let allWorks = this.works();

    // Aplicar filtro de estado
    if (statusFilter === 'pending') {
      allWorks = allWorks.filter(work => work.status === 'PENDING');
    }

    // Aplicar filtro de búsqueda
    if (!term) {
      return allWorks;
    }

    return allWorks.filter(work => {
      // Buscar en el ID de la obra
      const idMatch = work.id.toLowerCase().includes(term);
      
      // Buscar en el monto total (convertir a string para buscar)
      const amountMatch = work.totalAmount.toString().includes(term);

      return idMatch || amountMatch;
    });
  });

  // Computed signal para contar obras pendientes (basado en las obras filtradas)
  pendingCount = computed(() => {
    return this.filteredWorks().filter(work => work.status === 'PENDING').length;
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

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
