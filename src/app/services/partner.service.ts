import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface Partner {
  id: string;
  name: string;
  email: string;
  location: string;
  /** IDs de categorías que este partner provee (ej. 'Construcción', 'Pinturas'). */
  categoryIds: string[];
}

/** Lista mock de partners para logística de proveedores (calculadora / obra). */
const MOCK_PARTNERS: Partner[] = [
  {
    id: 'partner-martillo',
    name: 'Ferretería El Martillo',
    email: 'pedidos@elmartillo.com',
    location: 'Av. Principal 100, Centro',
    categoryIds: ['Construcción', 'Materiales pesados', 'Plomería'],
  },
  {
    id: 'partner-constru-todo',
    name: 'Constru-Todo',
    email: 'ventas@constru-todo.com',
    location: 'Zona Industrial Nº 5',
    categoryIds: ['Construcción', 'Acabados', 'Electricidad'],
  },
  {
    id: 'partner-pinturas-pro',
    name: 'Pinturas Pro',
    email: 'pedidos@pinturaspro.com',
    location: 'Calle Comercio 88',
    categoryIds: ['Pinturas', 'Acabados'],
  },
];

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  private readonly API_URL = 'https://s6txacomrf.execute-api.us-east-1.amazonaws.com/dev/partners';

  private _partners = signal<Partner[]>(MOCK_PARTNERS);
  readonly partners = this._partners.asReadonly();

  constructor() {
    this.loadPartners();
  }

  /**
   * Carga la lista de partners desde el backend.
   * Si falla, se mantienen los mock partners.
   */
  loadPartners(): void {
    this.http.get<Partner[]>(this.API_URL).pipe(
      tap((list) => this._partners.set(list ?? [])),
      catchError(() => of(MOCK_PARTNERS))
    ).subscribe();
  }

  /**
   * Devuelve los partners que pueden proveer un material dado (según categoryIds y categoría del material).
   * Ayuda al ingeniero a elegir al proveedor más cercano o conveniente.
   */
  getPartnersByMaterial(materialId: string): Observable<Partner[]> {
    return of(this.getPartnersByMaterialSync(materialId));
  }

  /**
   * Versión síncrona: partners cuya lista categoryIds incluye la categoría del material.
   */
  getPartnersByMaterialSync(materialId: string): Partner[] {
    const catalog = this.configService.catalog();
    const material = catalog?.services?.find((s) => s.id === materialId);
    const materialCategory = material?.category ?? 'Construcción';
    return this._partners().filter((p) => p.categoryIds.includes(materialCategory));
  }

  /**
   * Obtiene un partner por id.
   */
  getPartnerById(partnerId: string): Partner | undefined {
    return this._partners().find((p) => p.id === partnerId);
  }
}
