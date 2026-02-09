import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowLeft, User, Mail, Phone, FileText, Upload, Send, CircleCheck } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
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
  requestId = signal(Math.floor(10000 + Math.random() * 90000));

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
    const d = this.auth.navigationData() as FigmaFinancingFormData & { amount?: number } | null;
    if (d && (d.amount != null || (typeof (d as FigmaFinancingFormData).amount === 'string'))) {
      const amount = typeof (d as { amount?: number | string }).amount === 'number'
        ? (d as { amount: number }).amount
        : parseFloat((d as FigmaFinancingFormData).amount ?? '');
      if (!isNaN(amount)) this.form.update((f) => ({ ...f, budget: String(amount) }));
    }
  }

  onSubmit() {
    this.submitted.set(true);
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
