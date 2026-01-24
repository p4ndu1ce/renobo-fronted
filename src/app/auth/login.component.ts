import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
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
          console.log('Login response:', response);
          
          // Guardar token y usuario
          this.authService.setAuth(
            response.token,
            { id: `user-${response.user.email}`, email: response.user.email, role: response.user.role }
          );
          
          // Verificar que se estableció correctamente
          console.log('Después de setAuth:', {
            isLoggedIn: this.authService.isLoggedIn(),
            userRole: this.authService.userRole(),
            currentUser: this.authService.currentUser()
          });
          
          // Pequeño delay para asegurar que los signals se actualicen
          setTimeout(() => {
            // Redirigir a la URL de retorno o a la calculadora
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/calculadora';
            console.log('Navegando a:', returnUrl);
            this.router.navigate([returnUrl]);
          }, 0);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Error al iniciar sesión. Verifica tus credenciales.';
          console.error('Error en login:', err);
        }
      });
    }
  }
}
