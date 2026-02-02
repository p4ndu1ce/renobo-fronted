import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Ingeniero disponible para asignar por el supervisor (desde GET /engineers). */
export interface Engineer {
  id: string;
  name: string;
  especialidad: string;
  zona: string;
}

/** Respuesta de GET /engineers (usuarios con role ENGINEER). */
interface EngineerApiResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  especialidad?: string;
  zona?: string;
}

@Injectable({ providedIn: 'root' })
export class EngineerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly API_URL = `${environment.apiUrl}/engineers`;

  private _engineers = signal<Engineer[]>([]);
  readonly engineers = this._engineers.asReadonly();

  private _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Carga la lista de ingenieros desde GET ${apiUrl}/engineers (usuarios con role ENGINEER).
   * Solo hace la petición si hay token. Llamar desde el dashboard del supervisor.
   */
  getEngineers(): Observable<Engineer[]> {
    if (!this.authService.getToken()) {
      return of([]);
    }
    this._isLoading.set(true);
    return this.http.get<EngineerApiResponse[]>(this.API_URL).pipe(
      map((list) =>
        (list ?? []).map((u) => ({
          id: u.id ?? u.email,
          name: u.name ?? u.email ?? '—',
          especialidad: u.especialidad ?? 'Por asignar',
          zona: u.zona ?? 'Por asignar',
        }))
      ),
      map((list) => {
        this._engineers.set(list);
        return list;
      }),
      finalize(() => this._isLoading.set(false)),
      catchError((err) => {
        console.error('Error al obtener ingenieros:', err);
        this._engineers.set([]);
        return of([]);
      })
    );
  }
}
