import { Injectable, signal, computed } from '@angular/core';
import type { Wallet } from '../models/types';

@Injectable({ providedIn: 'root' })
export class WalletService {
  /** Billetera del usuario actual (cliente: crédito disponible; ingeniero: comisiones por cobrar). Mock en memoria hasta integrar backend. */
  private _userWallet = signal<Wallet | null>(null);
  readonly userWallet = this._userWallet.asReadonly();

  /** Balance numérico para binding rápido. */
  readonly balance = computed(() => this._userWallet()?.balance ?? 0);
  readonly currency = computed(() => this._userWallet()?.currency ?? 'USD');
  readonly lastUpdate = computed(() => this._userWallet()?.lastUpdate ?? '');

  /** Establece la billetera (p. ej. cliente: balance calculado desde obras). */
  setWallet(wallet: Wallet): void {
    this._userWallet.set(wallet);
  }

  /** Suma un monto al balance (p. ej. ingeniero: comisión por obra finalizada). Mock: actualiza solo en memoria. */
  addBalance(amount: number, currency = 'USD'): void {
    const now = new Date().toISOString();
    const current = this._userWallet();
    const newBalance = (current?.balance ?? 0) + amount;
    this._userWallet.set({ balance: newBalance, currency: current?.currency ?? currency, lastUpdate: now });
  }

  /** Resta un monto del balance (p. ej. cliente: cuando una obra se marca FINISHED). Mock: actualiza solo en memoria. */
  subtractBalance(amount: number): void {
    const now = new Date().toISOString();
    const current = this._userWallet();
    const newBalance = Math.max(0, (current?.balance ?? 0) - amount);
    this._userWallet.set({ balance: newBalance, currency: current?.currency ?? 'USD', lastUpdate: now });
  }

  /** Inicializa wallet en 0 (p. ej. al cambiar de usuario o rol). */
  reset(): void {
    this._userWallet.set(null);
  }
}
