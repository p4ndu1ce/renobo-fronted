import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { LoadingButtonComponent } from '../shared/components/loading-button/loading-button.component';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterLink, LoadingButtonComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  private readonly AUTH_API_URL = 'https://m587zdkcje.execute-api.us-east-1.amazonaws.com/dev/auth/register';

  errorMessage = '';
  isSubmitting = signal(false);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    documentId: ['', [Validators.required, Validators.minLength(5)]],
    role: ['CLIENT', [Validators.required]] // Por defecto CLIENT para usuarios nuevos
  }, { validators: passwordMatchValidator });

  onSubmit() {
    if (this.registerForm.valid) {
      this.errorMessage = '';
      this.isSubmitting.set(true);
      const { name, email, password, documentId, role } = this.registerForm.value;

      this.http.post<{ message: string; usuario: { name: string; email: string; role: string } }>(
        this.AUTH_API_URL,
        { name, email, password, documentId, role }
      ).subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage = err.error?.error || 'Error al registrar. Intenta nuevamente.';
          console.error('Error en registro:', err);
        }
      });
    }
  }
}
