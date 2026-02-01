import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

/** Perfil de crédito enviado con la solicitud para que el Supervisor lo revise. */
export interface CreditRequestUserProfile {
  status: string;
  score: number;
  previousCredits: number;
  isMoroso: boolean;
}

export type WorkStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_CREDIT'
  | 'CREDIT_APPROVED'
  | 'CREDIT_REJECTED'
  | 'ASSIGNED';

export type CreditPlanId = 'BRONCE' | 'PLATA' | 'ORO';

/** Material vinculado a un Partner (ferretería) para Paso 3/4. */
export interface WorkMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  partnerId: string;
  partnerName?: string;
  confirmedByPartner?: boolean;
  confirmedAt?: string;
}

export interface Work {
  id: string;
  descripcion: string;
  ubicacion?: string;
  presupuestoInicial?: number;
  estado: WorkStatus;
  createdAt: string;
  userEmail?: string;
  PK?: string;
  SK?: string;
  // ---- Nuevo flujo: Solicitud de Crédito (Paso 1) ----
  planId?: CreditPlanId;
  planAmount?: number;
  description?: string; // motivo/descripción del cliente
  // ---- Perfil enviado por el cliente (para que el Supervisor revise) ----
  userProfile?: CreditRequestUserProfile;
  // ---- Paso 2 (Supervisor) ----
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  // ---- Paso 3 (Ingeniero) ----
  assignedEngineerId?: string;
  assignedAt?: string;
  materials?: WorkMaterial[];
  // ---- Paso 4 (Logística) ----
  partnerConfirmationDeadline?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://s6txacomrf.execute-api.us-east-1.amazonaws.com/dev/works';

  // Signal para almacenar la lista de obras (admin / todas)
  private _works = signal<Work[]>([]);
  public works = this._works.asReadonly();

  // Signal para las obras del usuario actual
  private _myWorks = signal<Work[]>([]);
  public readonly myWorks = this._myWorks.asReadonly();

  /**
   * Obtiene las obras del usuario desde el backend.
   * El backend puede usar userId por query param o extraerlo del token en la Lambda.
   * Devuelve un Observable para que el caller pueda subscribe() y disparar la petición.
   */
  getUserWorks(userId: string): Observable<Work[]> {
    return this.http.get<Work[]>(this.API_URL, { params: { userId } }).pipe(
      map((works) => (works ?? []).map((work) => this.transformWork(work))),
      tap((transformed) => {
        // Mantener obras añadidas de forma optimista que el servidor aún no devuelve (consistencia eventual del GSI)
        const existing = this._myWorks();
        const serverIds = new Set(transformed.map((w) => w.id));
        const onlyLocal = existing.filter((w) => !serverIds.has(w.id));
        this._myWorks.set([...onlyLocal, ...transformed]);
      }),
      catchError((err) => {
        console.error('Error al obtener obras del usuario:', err);
        this._myWorks.set([]);
        return of([]);
      })
    );
  }

  /**
   * Crea una solicitud de crédito (Paso 1). Incluye el perfil financiero del usuario
   * para que el Supervisor reciba la solicitud con el perfil adjunto.
   */
  createCreditRequest(
    planId: CreditPlanId,
    planAmount: number,
    description: string,
    userProfile: CreditRequestUserProfile
  ): Observable<{ message: string; work: Work }> {
    const body = {
      planId,
      planAmount,
      description,
      userProfile,
    };
    return this.http.post<{ message: string; work: Work }>(this.API_URL, body).pipe(
      tap((res) => {
        if (res?.work) {
          const w: Work = {
            id: res.work.id,
            descripcion: description,
            description,
            planId,
            planAmount,
            estado: 'PENDING_CREDIT',
            createdAt: res.work.createdAt ?? new Date().toISOString(),
          };
          this.prependToMyWorks(w);
        }
      }),
      catchError((err) => {
        console.error('Error al crear solicitud de crédito:', err);
        throw err;
      })
    );
  }

  /**
   * Añade una obra al inicio de myWorks (p. ej. tras crear una solicitud).
   * Así se ve de inmediato en Servicios Recientes sin esperar al GET.
   */
  prependToMyWorks(work: Work): void {
    const current = this._myWorks();
    if (current.some((w) => w.id === work.id)) return;
    this._myWorks.set([work, ...current]);
  }

  /**
   * Obtiene todas las obras desde el backend (admin)
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
  updateWorkStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'CREDIT_APPROVED' | 'CREDIT_REJECTED'): void {
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
