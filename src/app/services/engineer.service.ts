import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/** Ingeniero disponible para asignar por el supervisor. */
export interface Engineer {
  id: string;
  name: string;
  especialidad: string;
  zona: string;
}

/** Lista mock de ingenieros (rol ENGINEER). Sustituir por GET /users?role=ENGINEER cuando exista. */
const MOCK_ENGINEERS: Engineer[] = [
  { id: 'eng-1', name: 'Carlos Méndez', especialidad: 'Electricidad y A/C', zona: 'Centro / Norte' },
  { id: 'eng-2', name: 'María López', especialidad: 'Plomería y Gas', zona: 'Sur / Este' },
  { id: 'eng-3', name: 'Roberto Sánchez', especialidad: 'Construcción y Acabados', zona: 'Metropolitana' },
  { id: 'eng-4', name: 'Ana Torres', especialidad: 'Pintura y Restauración', zona: 'Centro / Oeste' },
];

@Injectable({ providedIn: 'root' })
export class EngineerService {
  /**
   * Obtiene todos los ingenieros disponibles (rol ENGINEER).
   * Por ahora devuelve una lista simulada; cuando el backend exponga GET /users?role=ENGINEER, se sustituye por HTTP.
   */
  getEngineers(): Observable<Engineer[]> {
    return of([...MOCK_ENGINEERS]);
  }
}
