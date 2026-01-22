import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Service {
  id: string;
  category: string;
  name: string;
  price: {
    currency: string;
    value: number;
  };
  unit: string;
}

export interface CreditPlan {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
}

export interface PublicConfig {
  services: Service[];
  creditPlans: CreditPlan[];
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
        this.http.get<PublicConfig>('https://qvdde3mbs8.execute-api.us-east-1.amazonaws.com/dev/config/public')
      );
      this._catalog.set(config);
    } catch (error) {
      console.error('Error al cargar la configuración:', error);
      this._catalog.set(null);
    }
  }
}
