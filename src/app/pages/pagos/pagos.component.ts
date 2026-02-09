import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '../../shared/lucide-icons.module';
import { ArrowLeft, CreditCard, Calendar, DollarSign, Check, Upload, CheckCircle2, ChevronRight, Send } from 'lucide-angular';
import { ConfigService } from '../../services/config.service';
import { PaymentsService, type PaymentRecord, type PaymentType } from '../../services/payments.service';

const FALLBACK_BANK = {
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
export class PagosComponent implements OnInit {
  private router = inject(Router);
  private configService = inject(ConfigService);
  private paymentsService = inject(PaymentsService);

  readonly icons = { ArrowLeft, CreditCard, Calendar, DollarSign, Check, Upload, CheckCircle2, ChevronRight, Send };

  /** Datos bancarios desde config o fallback. */
  bankDetails = computed(() => this.configService.catalog()?.bankDetails ?? FALLBACK_BANK);

  /** 0 = historial, 1 = paso datos banco, 2 = paso formulario, 3 = éxito */
  step = signal(0);

  /** Tipo de pago seleccionado en el formulario */
  paymentType = signal<PaymentType>('cuota');
  amount = signal<string>('');
  reference = signal('');
  paymentDate = signal('');
  proofFile = signal<File | null>(null);
  proofFileName = signal<string | null>(null);

  payments = this.paymentsService.payments;
  nextDue = this.paymentsService.nextDue;
  loading = this.paymentsService.loading;
  submitting = this.paymentsService.submitting;

  paymentTypeLabel = computed(() => {
    const t = this.paymentType();
    if (t === 'inicial') return 'Pago inicial';
    if (t === 'adelanto') return 'Adelanto de cuotas';
    return 'Pago de cuota';
  });

  ngOnInit(): void {
    this.paymentsService.getPayments().subscribe();
    this.paymentsService.getNextDue().subscribe();
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
    const amountStr = this.amount().trim().replace(/,/g, '');
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) return;
    const type = this.paymentType();
    const reference = this.reference().trim() || undefined;
    const date = this.paymentDate().trim() || new Date().toISOString();
    this.paymentsService.createPayment({ amount: amountNum, type, reference, date }).subscribe({
      next: () => this.nextStep(),
      error: () => {},
    });
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
