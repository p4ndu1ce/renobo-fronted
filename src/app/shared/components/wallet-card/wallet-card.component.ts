import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-wallet-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './wallet-card.component.html',
  styleUrl: './wallet-card.component.css',
})
export class WalletCardComponent {
  /** Balance a mostrar. */
  balance = input.required<number>();
  /** Subtítulo: "Crédito disponible para servicios" (cliente) o "Comisiones por cobrar" (ingeniero). */
  subtitle = input.required<string>();
  /** Moneda para formatear (ej. USD). */
  currency = input<string>('USD');
  /** Badge opcional: "Crédito Activo", "+12.5%", etc. */
  badge = input<string>('');
}
