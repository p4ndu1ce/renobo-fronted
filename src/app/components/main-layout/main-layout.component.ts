import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PartnerService } from '../../services/partner.service';
import { BottomNavbarComponent } from '../bottom-navbar/bottom-navbar.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, BottomNavbarComponent, NotificationBellComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private partnerService = inject(PartnerService);
  private router = inject(Router);

  userName = this.authService.userName;
  isProfileMenuOpen = signal(false);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.partnerService.loadPartners();
    }
  }

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
