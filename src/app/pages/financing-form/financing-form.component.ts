import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, User, Mail, Phone, FileText, Upload, Send, CircleCheck } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { FinancingService } from '../../services/financing.service';
import type { FigmaFinancingFormData } from '../../models/figma-ui.types';

@Component({
  selector: 'app-financing-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './financing-form.component.html',
  styleUrl: './financing-form.component.css',
})
export class FinancingFormComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private financingService = inject(FinancingService);

  /** Datos del plan/simulador (interfaz Figma); el backend puede devolver esto en el futuro. */
  simulatorData = computed(() => this.auth.navigationData() as (FigmaFinancingFormData & { amount?: number }) | null);
  data = this.simulatorData;
  planName = computed(() => {
    const planId = this.data()?.plan;
    const plans: Record<string, string> = {
      'express': 'RENOEXPRESS',
      'standard': 'RENOSTANDAR',
      'expanded': 'RENOAMPLIADO'
    };
    return plans[planId ?? ''] ?? 'Plan Personalizado';
  });

  submitted = signal(false);
  submitting = signal(false);
  /** Mensaje general (ej. error de envío). */
  errorMessage = signal<string | null>(null);
  /** Errores por campo: clave = nombre del campo, valor = mensaje. */
  fieldErrors = signal<Record<string, string>>({});
  /** Código de solicitud devuelto por el backend (6 caracteres). */
  requestId = signal('');

  form = signal({
    fullName: '',
    email: '',
    phone: '',
    category: '',
    description: '',
    budget: '',
  });

  readonly icons = { ArrowLeft, User, Mail, Phone, FileText, Upload, Send, CircleCheck };
  categories = ['Electricidad', 'Plomería', 'Carpintería', 'Pintura', 'A/C', 'General'];
  files = signal<File[]>([]);

  ngOnInit() {
    const applyUserToForm = () => {
      const user = this.auth.currentUser();
      this.form.update((f) => ({
        ...f,
        fullName: (user?.name ?? '').trim(),
        email: (user?.email ?? '').trim(),
        phone: (user?.phone ?? f.phone || '').trim() || f.phone,
      }));
    };
    applyUserToForm();
    this.auth.loadUserProfile().subscribe({
      next: () => applyUserToForm(),
      error: () => {},
    });

    const d = this.auth.navigationData() as FigmaFinancingFormData & { amount?: number } | null;
    if (d && (d.amount != null || (typeof (d as FigmaFinancingFormData).amount === 'string'))) {
      const amount = typeof (d as { amount?: number | string }).amount === 'number'
        ? (d as { amount: number }).amount
        : parseFloat((d as FigmaFinancingFormData).amount ?? '');
      if (!isNaN(amount)) this.form.update((f) => ({ ...f, budget: String(amount) }));
    }
  }

  /** Mensaje de error para un campo (para el template). */
  fieldError(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  onSubmit(event?: SubmitEvent) {
    event?.preventDefault();
    const f = this.form();
    const planId = this.data()?.plan ?? '';
    const errors: Record<string, string> = {};
    if (!planId) {
      errors['plan'] = 'Selecciona un plan desde la pantalla de Financiamiento antes de enviar.';
    }
    if (!f.fullName?.trim()) errors['fullName'] = 'El nombre es requerido.';
    if (!f.email?.trim()) errors['email'] = 'El correo es requerido.';
    if (!f.phone?.trim()) errors['phone'] = 'El teléfono es requerido.';
    if (!f.category?.trim()) errors['category'] = 'Selecciona una categoría.';
    if (!f.description?.trim()) errors['description'] = 'La descripción es requerida.';
    if (!f.budget?.trim()) errors['budget'] = 'El presupuesto es requerido.';

    this.fieldErrors.set(errors);
    const hasErrors = Object.keys(errors).length > 0;
    this.errorMessage.set(hasErrors ? (errors['plan'] && Object.keys(errors).length === 1 ? errors['plan'] : 'Revisa los campos marcados.') : null);
    if (hasErrors) return;

    this.submitting.set(true);
    this.financingService.createRequest({
      fullName: f.fullName.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      planId,
      category: f.category.trim(),
      description: f.description.trim(),
      budget: f.budget.trim(),
    }).subscribe({
      next: (res) => {
        this.fieldErrors.set({});
        this.errorMessage.set(null);
        this.requestId.set(res.requestCode ?? res.id ?? '');
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error ?? err?.message ?? 'Error al enviar la solicitud. Intenta de nuevo.');
        this.submitting.set(false);
      },
    });
  }

  updateFormField(field: 'fullName' | 'email' | 'phone' | 'category' | 'description' | 'budget', value: string | number) {
    const str = value === null || value === undefined ? '' : String(value);
    this.form.update((f) => ({ ...f, [field]: str }));
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = input.files ? Array.from(input.files) : [];
    this.files.update((prev) => [...prev, ...selected]);
    input.value = '';
  }

  goBack() {
    this.router.navigate(['/financing']);
  }

  goHome() {
    this.router.navigate(['/home']);
  }
}
