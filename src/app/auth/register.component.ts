import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, User, Mail, Phone, FileText, Lock, FingerprintPattern } from 'lucide-angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly AUTH_API_URL =
    'https://m587zdkcje.execute-api.us-east-1.amazonaws.com/dev/auth/register';

  name = signal('');
  email = signal('');
  phone = signal('');
  documentId = signal('');
  role = signal<'CLIENT' | 'ENGINEER' | 'AFFILIATOR' | 'CREW'>('CLIENT');
  password = signal('');
  confirmPassword = signal('');

  errorMessage = signal('');
  isSubmitting = signal(false);

  readonly UserIcon = User;
  readonly MailIcon = Mail;
  readonly PhoneIcon = Phone;
  readonly FileTextIcon = FileText;
  readonly LockIcon = Lock;
  readonly FingerprintIcon = FingerprintPattern;

  onSubmit() {
    const n = this.name().trim();
    const e = this.email().trim();
    const doc = this.documentId().trim();
    const p = this.password();
    const cp = this.confirmPassword();

    this.errorMessage.set('');

    if (n.length < 2) {
      this.errorMessage.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(e)) {
      this.errorMessage.set('Email inválido.');
      return;
    }
    if (doc.length < 5) {
      this.errorMessage.set('Documento de identidad requerido (mín. 5 caracteres).');
      return;
    }
    if (p.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (p !== cp) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isSubmitting.set(true);

    this.http
      .post<{ message: string; usuario: { name: string; email: string; role: string } }>(
        this.AUTH_API_URL,
        { name: n, email: e, password: p, documentId: doc, role: this.role() }
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.error || 'Error al registrar. Intenta nuevamente.');
          console.error('Error en registro:', err);
        },
      });
  }
}
