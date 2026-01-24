import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type WorkStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'APPROVED' | 'REJECTED';

export interface Work {
  id: string;
  descripcion: string;
  ubicacion: string;
  presupuestoInicial: number;
  estado: WorkStatus;
  createdAt: string;
  userEmail?: string; // Email del cliente que creó la obra
  // Campos adicionales que pueden venir del backend
  PK?: string;
  SK?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://s6txacomrf.execute-api.us-east-1.amazonaws.com/dev/works';

  // Signal para almacenar la lista de obras
  private _works = signal<Work[]>([]);
  public works = this._works.asReadonly();

  /**
   * Obtiene todas las obras desde el backend
   */
  getAllWorks(): void {
    this.http.get<Work[]>(this.API_URL).subscribe({
      next: (works) => {
        // Transformar las obras del formato DynamoDB al formato del frontend
        const transformedWorks = works.map(work => this.transformWork(work));
        this._works.set(transformedWorks);
      },
      error: (err) => {
        console.error('Error al obtener obras:', err);
        this._works.set([]);
      }
    });
  }

  /**
   * Actualiza el estado de una obra
   * @param id ID de la obra
   * @param status Nuevo estado ('APPROVED' | 'REJECTED')
   */
  updateWorkStatus(id: string, status: 'APPROVED' | 'REJECTED'): void {
    this.http.patch<{ message: string; work: Work }>(
      `${this.API_URL}/${id}`,
      { estado: status }
    ).subscribe({
      next: (response) => {
        // Actualizar la obra en la lista local
        const currentWorks = this._works();
        const updatedWorks = currentWorks.map(work => 
          work.id === id 
            ? { ...work, estado: status }
            : work
        );
        this._works.set(updatedWorks);
      },
      error: (err) => {
        console.error('Error al actualizar estado de la obra:', err);
        throw err;
      }
    });
  }

  /**
   * Transforma una obra del formato DynamoDB al formato del frontend
   */
  private transformWork(work: Work): Work {
    // Si la obra viene con PK y SK, extraer el ID del SK
    if (work.SK && work.SK.startsWith('WORK#')) {
      return {
        ...work,
        id: work.SK.replace('WORK#', ''),
        // Remover PK y SK del objeto final
        PK: undefined,
        SK: undefined
      } as Work;
    }
    return work;
  }
}
