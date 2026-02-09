import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

export interface Service {
  id: string;
  category: string;
  name: string;
  price: {
    currency: string;
    value: number;
  };
  unit: string;
  /** ID del partner (ferretería) que provee este material. Usado en calculadora técnica. */
  partnerId?: string;
  /** Nombre del partner para mostrar en calculadora técnica. */
  partnerName?: string;
}

/** Plan desde DB: PK "PLAN", SK "PLAN_X", name, description, minAmount, maxAmount, interestPercent. */
export interface CreditPlan {
  id: string;
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  interestPercent?: number;
}

export interface BankDetails {
  bankName: string;
  accountType: string;
  accountNumber: string;
  beneficiary: string;
  rif: string;
  referenceFormat: string;
}

export interface PublicConfig {
  services: Service[];
  creditPlans: CreditPlan[];
  bankDetails?: BankDetails | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly _catalog = signal<PublicConfig | null>(null);
  readonly catalog = this._catalog.asReadonly();

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<PublicConfig>('https://qvdde3mbs8.execute-api.us-east-1.amazonaws.com/dev/config/public').pipe(
          timeout(8000)
        )
      );
      this._catalog.set(config);
    } catch (error) {
      console.error('Error al cargar la configuración:', error);
      this._catalog.set(null);
    }
  }
}
