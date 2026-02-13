import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { PartnerService } from '../services/partner.service';
import { LucideAngularModule, Mail, Lock, FingerprintPattern } from 'lucide-angular';
import { BuildingLogoComponent } from '../components/building-logo/building-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, BuildingLogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private readonly loginUrl = `${environment.authApiUrl}/auth/login`;

  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  readonly MailIcon = Mail;
  readonly LockIcon = Lock;
  readonly FingerprintIcon = FingerprintPattern;

  onLogin() {
    const e = this.email().trim();
    const p = this.password();
    if (!e || !p) {
      this.errorMessage.set('Ingresa email y contraseña.');
      return;
    }
    if (p.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e)) {
      this.errorMessage.set('Email inválido.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.http
      .post<{ token: string; user: { name: string; email: string; role: string } }>(
        this.loginUrl,
        { email: e, password: p }
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          const user = {
            id: response.user.email ?? `user-${response.user.email}`,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
          };
          this.authService.setAuth(response.token, user);
          this.partnerService.loadPartners();
          this.authService.loadUserProfile().subscribe({
              next: () => {},
              complete: () => {
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
                this.router.navigate([returnUrl]);
              },
              error: () => {
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
                this.router.navigate([returnUrl]);
              },
            });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            err.error?.error || 'Error al iniciar sesión. Verifica tus credenciales.'
          );
          console.error('Error en login:', err);
        },
      });
  }
}
