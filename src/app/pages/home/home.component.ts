import { Component, inject, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfigService } from '../../services/config.service';
import { WorkService } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import type { WorkStatus } from '../../services/work.service';

export interface Categoria {
  nombre: string;
  icono: string;
  bg: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private workService = inject(WorkService);
  private authService = inject(AuthService);
  public configService = inject(ConfigService);

  recentWorks = computed(() => this.workService.myWorks().slice(0, 3));

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
    // El backend guarda userId = email en cada obra; hay que enviar el mismo valor en GET /works?userId=
    const userId = user?.email ?? user?.id;
    if (userId) {
      this.workService.getUserWorks(userId).subscribe();
    }
  }

  goToPlanSelection(): void {
    this.router.navigate(['/plan-selection']);
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

  getStatusClass(estado: WorkStatus): string {
    switch (estado) {
      case 'APPROVED':
      case 'CREDIT_APPROVED':
        return 'bg-emerald-100 text-emerald-700';
      case 'REJECTED':
      case 'CREDIT_REJECTED':
        return 'bg-rose-100 text-rose-700';
      case 'IN_PROGRESS':
      case 'OPEN':
      case 'PENDING_CREDIT':
      case 'ASSIGNED':
        return 'bg-amber-100 text-amber-700';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getStatusLabel(estado: WorkStatus): string {
    const labels: Record<WorkStatus, string> = {
      OPEN: 'En revisión',
      IN_PROGRESS: 'En proceso',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      PENDING_CREDIT: 'Pendiente de crédito',
      CREDIT_APPROVED: 'Crédito aprobado',
      CREDIT_REJECTED: 'Crédito rechazado',
      ASSIGNED: 'Asignado',
    };
    return labels[estado] ?? estado;
  }
}
