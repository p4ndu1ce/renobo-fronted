import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { PartnerService } from '../services/partner.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  
  private readonly AUTH_API_URL = 'https://m587zdkcje.execute-api.us-east-1.amazonaws.com/dev/auth/login';
  
  errorMessage = '';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.errorMessage = '';
      const { email, password } = this.loginForm.value;
      
      this.http.post<{ token: string; user: { name: string; email: string; role: string } }>(
        this.AUTH_API_URL,
        { email, password }
      ).subscribe({
        next: (response) => {
          const user = {
            id: response.user.email ?? `user-${response.user.email}`,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
          };
          this.authService.setAuth(response.token, user);
          this.partnerService.loadPartners();
          const userId = user.id ?? user.email ?? '';
          if (userId) {
            this.authService.loadUserProfile(userId).subscribe({
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
          } else {
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
            this.router.navigate([returnUrl]);
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Error al iniciar sesión. Verifica tus credenciales.';
          console.error('Error en login:', err);
        }
      });
    }
  }
}
