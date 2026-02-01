import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { PartnerService } from './partner.service';
import { NotificationService } from './notification.service';

/** Objeto "Pedido" por partner para simulación de envío de correo. */
export interface PedidoParaPartner {
  partnerName: string;
  partnerEmail: string;
  materials: { materialId: string; quantity: number; materialName?: string }[];
}

/** Perfil de crédito enviado con la solicitud para que el Supervisor lo revise. */
export interface CreditRequestUserProfile {
  status: string;
  score: number;
  previousCredits: number;
  isMoroso: boolean;
}

/** Estados de una obra (flujo crédito → visita técnica → partners → en curso). */
export type WorkStatus =
  | 'CREDIT_PENDING'
  | 'CREDIT_APPROVED'
  | 'TECHNICAL_VISIT_PENDING'
  | 'TECHNICAL_VISIT'
  | 'WAITING_PARTNERS'
  | 'IN_PROGRESS';

/** Estado de respuesta de un partner a la solicitud de disponibilidad. */
export type PartnerResponseStatus = 'PENDING' | 'CONFIRMED' | 'UNAVAILABLE';

export type CreditPlanId = 'BRONZE' | 'SILVER' | 'GOLD';

/** Ítem de la orden de materiales: incluye partnerId por material para logística de proveedores. */
export interface WorkItem {
  materialId: string;
  quantity: number;
  partnerId: string;
  price: number;
}

export interface Work {
  id: string;
  status: WorkStatus;
  planId: CreditPlanId;
  engineerId: string;
  items: WorkItem[];
  createdAt: string;
  // ---- Resto de campos ----
  descripcion?: string;
  ubicacion?: string;
  presupuestoInicial?: number;
  userEmail?: string;
  planAmount?: number;
  description?: string;
  userProfile?: CreditRequestUserProfile;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  assignedAt?: string;
  partnerConfirmationDeadline?: string;
  /** Fecha límite para respuesta de partners (ej. ahora + 48h). */
  partnerResponseDeadline?: string;
  /** Checklist de disponibilidad: partnerId -> PENDING | CONFIRMED | UNAVAILABLE. */
  partnerResponses?: Record<string, PartnerResponseStatus>;
  PK?: string;
  SK?: string;
}

/** Partner mínimo para generar el correo (id, name, email). */
export interface PartnerForEmail {
  id: string;
  name: string;
  email: string;
}

/** Items con nombre y unidad para el cuerpo del correo (lista punteada). */
export interface ItemForEmail {
  name: string;
  quantity: number;
  unit: string;
}

/** Contexto para generatePartnerEmail: nombre del ingeniero y lista de materiales con nombre/unidad. */
export interface PartnerEmailContext {
  engineerName: string;
  itemsWithLabels: ItemForEmail[];
}

/** Resultado del template de correo al partner. */
export interface PartnerEmailResult {
  subject: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class WorkService {
  private http = inject(HttpClient);
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);
  private readonly API_URL = 'https://s6txacomrf.execute-api.us-east-1.amazonaws.com/dev/works';

  private readonly HORAS_PLAZO_PARTNERS = 48;

  /** IDs de obras IN_PROGRESS ya notificadas al cliente (evitar duplicados). */
  private readonly notifiedInProgressIds = new Set<string>();

  // Signal para almacenar la lista de obras (admin / todas)
  private _works = signal<Work[]>([]);
  public works = this._works.asReadonly();

  // Signal para las obras del usuario actual
  private _myWorks = signal<Work[]>([]);
  public readonly myWorks = this._myWorks.asReadonly();

  /**
   * Obtiene las obras del usuario desde el backend.
   * Se envía GET /works?userId=<valor>. El backend asocia las obras por email, por eso
   * los callers pasan user?.email ?? user?.id (p. ej. works?userId=cliente@gmail.com).
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
        // Notificación al cliente: obras que pasaron a IN_PROGRESS (inicio de obra)
        transformed.forEach((w) => {
          if (w.status === 'IN_PROGRESS' && !this.notifiedInProgressIds.has(w.id)) {
            this.notificationService.add({
              title: '🚀 ¡Obra Iniciada!',
              message: 'El ingeniero ha confirmado los materiales. La cuadrilla empezará pronto.',
              type: 'success',
            });
            this.notifiedInProgressIds.add(w.id);
          }
        });
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
            status: 'CREDIT_PENDING',
            planId,
            engineerId: res.work.engineerId ?? '',
            items: res.work.items ?? [],
            createdAt: res.work.createdAt ?? new Date().toISOString(),
            descripcion: description,
            description,
            planAmount,
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
   * Asigna un ingeniero a la obra y pasa el estado a TECHNICAL_VISIT_PENDING.
   * Lo usa el supervisor tras aprobar el crédito.
   */
  assignEngineer(workId: string, engineerId: string): void {
    this.http.patch<{ message: string; work: Work }>(
      `${this.API_URL}/${workId}`,
      { status: 'TECHNICAL_VISIT_PENDING' as WorkStatus, engineerId }
    ).subscribe({
      next: (res) => {
        if (res?.work) {
          const updated = this.transformWork(res.work);
          const currentWorks = this._works();
          this._works.set(currentWorks.map(w => (w.id === workId ? updated : w)));
        }
      },
      error: (err) => {
        console.error('Error al asignar ingeniero:', err);
        throw err;
      }
    });
  }

  /**
   * Obtiene las obras asignadas al ingeniero (GET /works?engineerId=xxx).
   * El dashboard del ingeniero debe usar este método para ver solo sus obras.
   */
  getWorksByEngineerId(engineerId: string): Observable<Work[]> {
    return this.http.get<Work[]>(this.API_URL, { params: { engineerId } }).pipe(
      map((works) => (works ?? []).map((work) => this.transformWork(work))),
      tap((transformed) => {
        const currentWorks = this._works();
        const byId = new Map(currentWorks.map((w) => [w.id, w]));
        transformed.forEach((w) => byId.set(w.id, w));
        this._works.set(Array.from(byId.values()));
      }),
      catchError((err) => {
        console.error('Error al cargar obras del ingeniero:', err);
        return of([]);
      })
    );
  }

  /**
   * Actualiza el estado de una obra.
   */
  updateWorkStatus(id: string, status: WorkStatus): void {
    this.http.patch<{ message: string; work: Work }>(
      `${this.API_URL}/${id}`,
      { status }
    ).subscribe({
      next: () => {
        const currentWorks = this._works();
        this._works.set(currentWorks.map(work =>
          work.id === id ? { ...work, status } : work
        ));
        if (status === 'CREDIT_APPROVED') {
          this.notificationService.add({
            title: '¡Crédito Aprobado!',
            message: 'Tu plan ha sido validado por supervisión.',
            type: 'success',
          });
        }
      },
      error: (err) => {
        console.error('Error al actualizar estado de la obra:', err);
        throw err;
      }
    });
  }

  /**
   * Guarda los items de la obra incluyendo el partnerId de cada material (logística de proveedores).
   * Actualiza la obra con items: materialId, quantity, partnerId, price.
   *
   * Backend: al recibir este PATCH, debe enviar un correo automático a cada ferretería (partner)
   * con su lista correspondiente (agrupar items por partnerId y usar el email del partner para el envío).
   */
  submitMaterialsToSuppliers(workId: string, items: WorkItem[]): Observable<{ message: string; work?: Work }> {
    return this.http.patch<{ message: string; work: Work }>(
      `${this.API_URL}/${workId}`,
      { items }
    ).pipe(
      tap((res) => {
        if (res?.work) {
          const currentWorks = this._works();
          this._works.set(currentWorks.map(w =>
            w.id === workId ? { ...w, items: res.work!.items ?? items } : w
          ));
        }
      }),
      catchError((err) => {
        console.error('Error al enviar materiales a proveedores:', err);
        throw err;
      })
    );
  }

  /**
   * Confirma la visita técnica: agrupa materiales por partner, simula envío de correos (console.log),
   * actualiza la obra a WAITING_PARTNERS con partnerResponseDeadline = ahora + 48h.
   * Navegación y mensaje de éxito los maneja el componente.
   */
  confirmTechnicalVisit(workId: string, items: WorkItem[]): Observable<{ message: string; work?: Work }> {
    const partnerResponseDeadline = new Date(Date.now() + this.HORAS_PLAZO_PARTNERS * 60 * 60 * 1000).toISOString();

    // Agrupación: materiales por partnerId
    const byPartner = new Map<string, WorkItem[]>();
    for (const item of items) {
      const list = byPartner.get(item.partnerId) ?? [];
      list.push(item);
      byPartner.set(item.partnerId, list);
    }

    // Simulación de email: para cada proveedor, generar Pedido y console.log
    const pedidos: PedidoParaPartner[] = [];
    for (const [partnerId, partnerItems] of byPartner) {
      const partner = this.partnerService.getPartnerById(partnerId);
      pedidos.push({
        partnerName: partner?.name ?? partnerId,
        partnerEmail: partner?.email ?? '',
        materials: partnerItems.map(i => ({ materialId: i.materialId, quantity: i.quantity }))
      });
    }
    pedidos.forEach((pedido, index) => {
      console.log(`[Simulación envío ${index + 1}/${pedidos.length}] Pedido para ${pedido.partnerName} (${pedido.partnerEmail}):`, {
        partnerName: pedido.partnerName,
        partnerEmail: pedido.partnerEmail,
        materials: pedido.materials,
        totalItems: pedido.materials.reduce((sum, m) => sum + m.quantity, 0)
      });
    });

    // Cambio de estado + fecha límite: PATCH a AWS
    const body = {
      status: 'WAITING_PARTNERS' as WorkStatus,
      partnerResponseDeadline,
      items
    };
    return this.http.patch<{ message: string; work: Work }>(`${this.API_URL}/${workId}`, body).pipe(
      tap((res) => {
        if (res?.work) {
          const currentWorks = this._works();
          this._works.set(currentWorks.map(w =>
            w.id === workId
              ? { ...w, status: 'WAITING_PARTNERS', partnerResponseDeadline, items: res.work!.items ?? items }
              : w
          ));
        }
      }),
      map((res) => ({ message: res?.message ?? 'OK', work: res?.work })),
      catchError((err) => {
        console.error('Error en confirmTechnicalVisit:', err);
        throw err;
      })
    );
  }

  /**
   * Genera asunto y cuerpo del correo para notificar a un partner (solicitud de disponibilidad).
   * Template profesional: ID obra, ingeniero, fecha, lista punteada de materiales.
   */
  generatePartnerEmail(
    partner: PartnerForEmail,
    work: Work,
    context: PartnerEmailContext
  ): PartnerEmailResult {
    const workId = work.id;
    const partnerName = partner.name;
    const engineerName = context.engineerName;
    const currentDate = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const itemsList = context.itemsWithLabels
      .map((i) => `• ${i.name}: ${i.quantity} ${i.unit}`)
      .join('\n');

    const subject = `🏗️ SOLICITUD DE DISPONIBILIDAD: Orden #${workId} - Renobo Logística`;

    const body = `Estimado Aliado de ${partnerName},

Un Ingeniero Civil de la red Renobo ha generado una nueva lista de materiales para una obra en curso y ha seleccionado su sucursal como proveedor preferente.

Detalles de la Solicitud:

ID de Seguimiento: #${workId}

Ingeniero a cargo: ${engineerName}

Fecha de solicitud: ${currentDate}

Lista de Materiales Requeridos:

${itemsList}

Acción Requerida: Por políticas de servicio, solicitamos confirmar la disponibilidad de estos ítems en un plazo máximo de 48 horas. Puede responder a este correo o confirmar a través de nuestro portal de aliados.

Este es un proceso automatizado para agilizar el inicio de obra y el desembolso del crédito correspondiente.

Atentamente,
Equipo de Logística Renobo [Logo Naranja #fa5404]`;

    return { subject, body };
  }

  /**
   * Normaliza una obra del API/DynamoDB al formato del frontend (status, engineerId, items).
   */
  private transformWork(work: Partial<Work> & { estado?: string; assignedEngineerId?: string; materials?: Array<{ id: string; quantity: number; partnerId: string; price?: number }> }): Work {
    const status = (work.status ?? this.mapLegacyStatus(work.estado)) as WorkStatus;
    const engineerId = work.engineerId ?? work.assignedEngineerId ?? '';
    const items: WorkItem[] = (work.items ?? (work.materials ?? []).map((m) => ({
      materialId: m.id,
      quantity: m.quantity,
      partnerId: m.partnerId,
      price: m.price ?? 0,
    }))) as WorkItem[];

    let id = work.id ?? '';
    if (work.SK && String(work.SK).startsWith('WORK#')) {
      id = String(work.SK).replace('WORK#', '');
    }

    const rawPlanId = work.planId ?? 'BRONZE';
    const planId = this.mapLegacyPlanId(rawPlanId) as CreditPlanId;

    const partnerResponses = work.partnerResponses ?? {};
    return {
      ...work,
      id,
      status,
      planId,
      engineerId,
      items,
      partnerResponses,
      createdAt: work.createdAt ?? new Date().toISOString(),
      PK: undefined,
      SK: undefined,
    } as Work;
  }

  /**
   * Actualiza las respuestas de partners (checklist de disponibilidad). ENGINEER only.
   */
  updatePartnerResponse(workId: string, partnerResponses: Record<string, PartnerResponseStatus>): Observable<{ message: string; work: Work }> {
    return this.http.patch<{ message: string; work: Work }>(`${this.API_URL}/${workId}`, { partnerResponses }).pipe(
      tap((res) => {
        if (res?.work) {
          const w = this.transformWork(res.work);
          const currentWorks = this._works();
          this._works.set(currentWorks.map((x) => (x.id === workId ? w : x)));
        }
      }),
      map((res) => ({ message: res?.message ?? 'OK', work: this.transformWork(res?.work!) })),
      catchError((err) => {
        console.error('Error en updatePartnerResponse:', err);
        throw err;
      })
    );
  }

  /**
   * Pasa la obra a IN_PROGRESS (iniciar obra). Solo cuando todos los partners estén CONFIRMED.
   * El ingeniero ve una notificación de confirmación; el cliente la verá al cargar su pantalla de inicio (getUserWorks).
   */
  confirmStartWork(workId: string): Observable<{ message: string; work: Work }> {
    return this.http.patch<{ message: string; work: Work }>(`${this.API_URL}/${workId}`, { status: 'IN_PROGRESS' as WorkStatus }).pipe(
      tap((res) => {
        if (res?.work) {
          const w = this.transformWork(res.work);
          const currentWorks = this._works();
          this._works.set(currentWorks.map((x) => (x.id === workId ? w : x)));
        }
        this.notificationService.add({
          title: '🚀 Obra en marcha',
          message: 'El ingeniero ha iniciado el servicio.',
          type: 'success',
        });
      }),
      map((res) => ({ message: res?.message ?? 'OK', work: this.transformWork(res?.work!) })),
      catchError((err) => {
        console.error('Error en confirmStartWork:', err);
        throw err;
      })
    );
  }

  /** Alias para compatibilidad. */
  startWork(workId: string): Observable<{ message: string; work: Work }> {
    return this.confirmStartWork(workId);
  }

  /**
   * Actualiza el estado de una obra solo en memoria (signals). No llama al API.
   * Útil para debug / modo dios: ver cambios de vista al instante sin esperar AWS.
   */
  forceStatusUpdate(workId: string, newStatus: WorkStatus): void {
    const currentWorks = this._works();
    const work = currentWorks.find((w) => w.id === workId);
    if (work) {
      const updated = { ...work, status: newStatus };
      this._works.set(currentWorks.map((w) => (w.id === workId ? updated : w)));
      const myWorks = this._myWorks();
      if (myWorks.some((w) => w.id === workId)) {
        this._myWorks.set(myWorks.map((w) => (w.id === workId ? updated : w)));
      }
      console.log('DEBUG: Estado cambiado a', newStatus);
    }
  }

  /**
   * Cambia el estado de una obra (PATCH solo status). Útil para debug / modo dios.
   * No dispara notificaciones (para pruebas usar confirmStartWork si quieres notificación IN_PROGRESS).
   */
  setWorkStatus(workId: string, status: WorkStatus): Observable<{ message: string; work: Work }> {
    return this.http.patch<{ message: string; work: Work }>(`${this.API_URL}/${workId}`, { status }).pipe(
      tap((res) => {
        if (res?.work) {
          const w = this.transformWork(res.work);
          const currentWorks = this._works();
          this._works.set(currentWorks.map((x) => (x.id === workId ? w : x)));
          const myWorks = this._myWorks();
          if (myWorks.some((x) => x.id === workId)) {
            this._myWorks.set(myWorks.map((x) => (x.id === workId ? w : x)));
          }
        }
        if (status === 'CREDIT_APPROVED') {
          this.notificationService.add({
            title: '¡Crédito Aprobado!',
            message: 'Tu plan ha sido validado por supervisión.',
            type: 'success',
          });
        }
      }),
      map((res) => ({ message: res?.message ?? 'OK', work: this.transformWork(res?.work!) })),
      catchError((err) => {
        console.error('Error en setWorkStatus:', err);
        throw err;
      })
    );
  }

  /**
   * Pasa la obra a WAITING_PARTNERS con deadline 48h. Útil para debug / modo dios.
   */
  setWorkToWaitingPartners(workId: string, partnerResponseDeadline?: string): Observable<{ message: string; work: Work }> {
    const deadline = partnerResponseDeadline ?? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    return this.http.patch<{ message: string; work: Work }>(`${this.API_URL}/${workId}`, {
      status: 'WAITING_PARTNERS' as WorkStatus,
      partnerResponseDeadline: deadline,
    }).pipe(
      tap((res) => {
        if (res?.work) {
          const w = this.transformWork(res.work);
          const currentWorks = this._works();
          this._works.set(currentWorks.map((x) => (x.id === workId ? w : x)));
          const myWorks = this._myWorks();
          if (myWorks.some((x) => x.id === workId)) {
            this._myWorks.set(myWorks.map((x) => (x.id === workId ? w : x)));
          }
        }
      }),
      map((res) => ({ message: res?.message ?? 'OK', work: this.transformWork(res?.work!) })),
      catchError((err) => {
        console.error('Error en setWorkToWaitingPartners:', err);
        throw err;
      })
    );
  }

  private mapLegacyPlanId(planId: string): CreditPlanId {
    const map: Record<string, CreditPlanId> = { BRONCE: 'BRONZE', PLATA: 'SILVER', ORO: 'GOLD' };
    return (map[planId] ?? planId) as CreditPlanId;
  }

  private mapLegacyStatus(estado?: string): WorkStatus {
    switch (estado) {
      case 'PENDING_CREDIT': return 'CREDIT_PENDING';
      case 'CREDIT_APPROVED': return 'CREDIT_APPROVED';
      case 'CREDIT_REJECTED': return 'CREDIT_PENDING';
      case 'TECHNICAL_VISIT_PENDING': return 'TECHNICAL_VISIT_PENDING';
      case 'OPEN':
      case 'ASSIGNED': return 'TECHNICAL_VISIT';
      default: return (estado as WorkStatus) ?? 'CREDIT_PENDING';
    }
  }
}
