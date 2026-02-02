import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, finalize, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';
import type { Partner } from '../models/types';

export type { Partner };

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private readonly authService = inject(AuthService);

  private readonly API_URL = `${environment.apiUrl}/partners`;

  private _partners = signal<Partner[]>([]);
  readonly partners = this._partners.asReadonly();

  /** true mientras se carga la lista de partners (para Skeleton Loaders). */
  private _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Carga la lista de partners desde GET ${apiUrl}/partners.
   * Solo hace la petición si hay token (evita 401 al arrancar sin login).
   * Llamar tras login o al cargar el layout con sesión restaurada.
   */
  loadPartners(): void {
    if (!this.authService.getToken()) {
      return;
    }
    this._isLoading.set(true);
    type ApiPartner = { id: string; name: string; email: string; location: string; category?: string; categoryIds?: string[] };
    this.http.get<ApiPartner[]>(this.API_URL).pipe(
      map((list) => (list ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        location: p.location,
        category: p.category ?? p.categoryIds?.[0] ?? '',
      }))),
      tap((list) => this._partners.set(list)),
      finalize(() => this._isLoading.set(false)),
      catchError((err) => {
        console.error('Error al cargar partners:', err);
        this._partners.set([]);
        return of([]);
      })
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
   * Versión síncrona: partners cuya categoría coincide con la del material.
   * Si ninguno coincide, devuelve todos los partners para que el dropdown siempre tenga opciones.
   */
  getPartnersByMaterialSync(materialId: string): Partner[] {
    const catalog = this.configService.catalog();
    const services = catalog?.services ?? [];
    const material = services.find((s) => s.id === materialId);
    const materialCategory = material?.category ?? 'Construcción';
    const list = this._partners() ?? [];
    const byCategory = list.filter((p) => p?.category === materialCategory);
    return byCategory.length > 0 ? byCategory : list;
  }

  /**
   * Obtiene un partner por id.
   */
  getPartnerById(partnerId: string): Partner | undefined {
    return this._partners().find((p) => p.id === partnerId);
  }
}
