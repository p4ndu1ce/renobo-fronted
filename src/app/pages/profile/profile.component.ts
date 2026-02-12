import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { WorkService } from '../../services/work.service';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import type { CreditPlanId } from '../../services/work.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, SkeletonCardComponent, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  /** Datos financieros (credit score, estatus, badge). */
  private auth = inject(AuthService);
  /** Historial completo de notificaciones. */
  private notificationService = inject(NotificationService);
  private workService = inject(WorkService);
  private router = inject(Router);
  private location = inject(Location);

  readonly icons = { ArrowLeft };

  ngOnInit(): void {
    const user = this.auth.currentUser();
    const userId = user?.email ?? user?.id;
    if (userId) {
      this.workService.getUserWorks(userId).subscribe({ next: () => {}, error: () => {}, complete: () => this.isLoading.set(false) });
    } else {
      this.isLoading.set(false);
    }
  }

  /** true mientras se cargan datos (obras / perfil). */
  isLoading = signal(true);

  currentUser = this.auth.currentUser;
  userProfile = this.auth.userProfile;
  myWorks = this.workService.myWorks;
  notificationsList = this.notificationService.notificationsList;

  /** Iniciales para el avatar (nombre o email). */
  initials = computed(() => {
    const u = this.currentUser();
    if (u?.name?.trim()) {
      const parts = u.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return u.name.slice(0, 2).toUpperCase();
    }
    if (u?.email) {
      return u.email.slice(0, 2).toUpperCase();
    }
    return '?';
  });

  /** Badge: 'PAGOS AL DÍA' si está al día, sino 'USUARIO VERIFICADO'. */
  financialBadge = computed(() => {
    const p = this.userProfile();
    return p?.status === 'AL DÍA' ? 'PAGOS AL DÍA' : 'USUARIO VERIFICADO';
  });

  /** Estatus para la grid: Al día / Moroso. */
  statusLabel = computed(() => {
    const p = this.userProfile();
    if (!p) return '—';
    return p.isMoroso ? 'Moroso' : 'Al día';
  });

  /** Nivel (Bronce/Plata/Oro) según última obra o por defecto. */
  levelLabel = computed(() => {
    const works = this.myWorks();
    if (works.length === 0) return '—';
    const last = works[0];
    const planId = (last as { planId?: CreditPlanId }).planId;
    return this.planIdToLevel(planId);
  });

  creditCount = computed(() => this.myWorks().length);

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  removeNotification(id: string): void {
    this.notificationService.remove(id);
  }

  /** Navega a la vista anterior (o a /home si no hay historial). */
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/home']);
    }
  }

  /** Limpia el estado de sesión y navega al login con View Transition. */
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private planIdToLevel(planId?: CreditPlanId): string {
    switch (planId) {
      case 'BRONZE': return 'Bronce';
      case 'SILVER': return 'Plata';
      case 'GOLD': return 'Oro';
      default: return '—';
    }
  }
}
