import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BottomNavbarComponent } from '../bottom-navbar/bottom-navbar.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { DebugFabComponent } from '../../shared/components/debug-fab/debug-fab.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, BottomNavbarComponent, NotificationBellComponent, DebugFabComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userName = this.authService.userName;
  isProfileMenuOpen = signal(false);

  toggleProfileMenu() {
    this.isProfileMenuOpen.update((v) => !v);
  }

  closeProfileMenu() {
    this.isProfileMenuOpen.set(false);
  }

  logout() {
    this.closeProfileMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
