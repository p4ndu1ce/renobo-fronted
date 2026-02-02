/**
 * Tipos unificados del dominio Renobo.
 * Referencia única para User, Work y Partner en toda la app.
 */

/** Perfil financiero (usuario o contexto de solicitud). */
export interface FinancialProfile {
  status: 'AL DÍA' | 'MOROSO' | 'SIN ACTIVIDAD';
  score: number;
  creditsRequested: number;
}

/** Perfil de Usuario/Staff. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'ENGINEER' | 'SUPERVISOR';
  financialProfile?: FinancialProfile;
}

/** Ítem de materiales de una obra. */
export interface WorkItem {
  materialId: string;
  name?: string;
  quantity: number;
  partnerId: string;
  price: number;
  confirmed?: boolean;
}

/** Estados de una obra. */
export type WorkStatus =
  | 'CREDIT_PENDING'
  | 'CREDIT_APPROVED'
  | 'REJECTED'
  | 'TECHNICAL_VISIT_PENDING'
  | 'TECHNICAL_VISIT'
  | 'WAITING_PARTNERS'
  | 'IN_PROGRESS';

export type PlanId = 'BRONZE' | 'SILVER' | 'GOLD';

/** Objeto maestro de obra/servicio. */
export interface Work {
  id: string;
  userId: string;
  engineerId?: string;
  planId: PlanId;
  /** Título del proyecto (ej: Remodelación de Cocina). */
  title?: string;
  description: string;
  status: WorkStatus;
  createdAt: string;
  partnerDeadline?: string;
  items?: WorkItem[];
  /** Perfil financiero enviado con la solicitud (para que el supervisor vea score). */
  financialProfile?: FinancialProfile;
  /** Monto del plan (para mostrar en UI). */
  planAmount?: number;
  /** Checklist de disponibilidad: partnerId -> PENDING | CONFIRMED | UNAVAILABLE. */
  partnerResponses?: Record<string, 'PENDING' | 'CONFIRMED' | 'UNAVAILABLE'>;
  /** Motivo de rechazo (cuando status es REJECTED). */
  rejectionReason?: string;
  /** Datos del solicitante persistidos (Supervisor los ve sin consultar otra tabla). */
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

/** Aliados comerciales. */
export interface Partner {
  id: string;
  name: string;
  email: string;
  category: string;
  location: string;
}
