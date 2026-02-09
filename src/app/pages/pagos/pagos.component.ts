import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '../../shared/lucide-icons.module';
import { ArrowLeft, CreditCard, Calendar, DollarSign, Check, Upload, CheckCircle2, ChevronRight, Send } from 'lucide-angular';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  description?: string;
}

export type PaymentType = 'inicial' | 'cuota' | 'adelanto';

/** Datos bancarios para transferencia (mock; pueden venir de config). */
const BANK_DETAILS = {
  bankName: 'Banco de Venezuela',
  accountType: 'Cuenta Corriente',
  accountNumber: '0102-0123-4567-8901234',
  beneficiary: 'RENOBO C.A.',
  rif: 'J-12345678-9',
  referenceFormat: 'Tu número de crédito o celular',
};

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css',
})
export class PagosComponent {
  private router = inject(Router);

  readonly icons = { ArrowLeft, CreditCard, Calendar, DollarSign, Check, Upload, CheckCircle2, ChevronRight, Send };
  readonly bankDetails = BANK_DETAILS;

  /** 0 = historial, 1 = paso datos banco, 2 = paso formulario, 3 = éxito */
  step = signal(0);

  /** Tipo de pago seleccionado en el formulario */
  paymentType = signal<PaymentType>('cuota');
  amount = signal<string>('');
  reference = signal('');
  paymentDate = signal('');
  proofFile = signal<File | null>(null);
  proofFileName = signal<string | null>(null);

  /** Historial de pagos (mock). */
  payments = signal<PaymentRecord[]>([]);

  /** Próxima cuota a pagar (mock; luego desde API). null = sin cuota pendiente. */
  nextDue = signal<{ amount: number; dueDate: string } | null>({
    amount: 85,
    dueDate: '2026-02-20',
  });

  paymentTypeLabel = computed(() => {
    const t = this.paymentType();
    if (t === 'inicial') return 'Pago inicial';
    if (t === 'adelanto') return 'Adelanto de cuotas';
    return 'Pago de cuota';
  });

  constructor() {
    this.payments.set([
      { id: '1', date: '2026-01-15T10:30:00', amount: 85, description: 'Cuota Plan Bronce' },
      { id: '2', date: '2025-12-10T14:00:00', amount: 85, description: 'Cuota Plan Bronce' },
      { id: '3', date: '2025-11-08T09:15:00', amount: 120, description: 'Cuota Plan Plata' },
    ]);
  }

  goBack(): void {
    if (this.step() > 0) {
      this.step.update((s) => s - 1);
    } else {
      this.router.navigate(['/home']);
    }
  }

  startPaymentFlow(): void {
    this.step.set(1);
    this.paymentType.set('cuota');
    this.amount.set('');
    this.reference.set('');
    this.paymentDate.set('');
    this.proofFile.set(null);
    this.proofFileName.set(null);
  }

  nextStep(): void {
    this.step.update((s) => Math.min(s + 1, 3));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.proofFile.set(file);
      this.proofFileName.set(file.name);
    }
  }

  removeProof(): void {
    this.proofFile.set(null);
    this.proofFileName.set(null);
  }

  submitPayment(): void {
    // TODO: enviar a API (tipo, monto, referencia, fecha, archivo). Por ahora solo pasamos al éxito.
    this.nextStep();
  }

  finishAndBack(): void {
    this.step.set(0);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  }

  formatDueDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
