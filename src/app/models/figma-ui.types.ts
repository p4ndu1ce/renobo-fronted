/**
 * Interfaces de UI basadas en el export de Figma (renobo.app).
 * Son el contrato de la interfaz; el backend se adaptará a estas formas.
 * Referencia: _figma-export/src/app/
 */

/** Usuario en sesión (Auth, Dashboard). */
export interface FigmaUser {
  name: string;
  email: string;
}

/** Categoría de servicio en el Dashboard / Categorías. */
export interface FigmaServiceCategory {
  id: string;
  name: string;
  /** Nombre del icono Lucide (ej: 'Zap', 'Droplet'). */
  icon: string;
  /** Clase Tailwind de color (ej: 'text-yellow-500'). */
  color: string;
  /** Opcional: fondo (ej: 'bg-yellow-50'). */
  bgColor?: string;
  /** Lista de servicios bajo la categoría (p. ej. en pantalla Categorías). */
  services?: string[];
}

/** Servicio reciente en el Dashboard (lista "Servicios Recientes"). */
export interface FigmaRecentService {
  id: number | string;
  title: string;
  status: string;
  date: string;
  /** Fecha y hora de la visita técnica cuando está agendada. */
  visitDate?: string;
}

/** Datos que se pasan al formulario de financiación (plan seleccionado + simulador). */
export interface FigmaFinancingFormData {
  plan?: string;
  amount?: string;
  installments?: string;
}

/** Plan de financiación (RENOEXPRESS, RENOSTANDAR, RENOAMPLIADO). */
export interface FigmaFinancingPlan {
  id: string;
  name: string;
  /** Nombre del icono Lucide. */
  icon: string;
  range: string;
  minAmount: number;
  maxAmount: number;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  features: string[];
}

/** Datos al solicitar un servicio (categoría + servicio elegido). */
export interface FigmaServiceRequestData {
  category?: string;
  service?: string;
}

/** Datos extendidos al pasar de solicitud a presupuesto (incl. descripción y archivos). */
export interface FigmaBudgetRequestData extends FigmaServiceRequestData {
  description?: string;
  files?: string[];
}

/** Presupuesto de técnico (pantalla BudgetScreen). */
export interface FigmaTechnicianBudget {
  id: number;
  technicianName: string;
  rating: number;
  completedJobs: number;
  price: number;
  estimatedTime: string;
  availability: string;
  description: string;
}

/** Datos que recibe la pantalla de seguimiento (tracking). */
export interface FigmaTrackingServiceData {
  id?: string;
  title?: string;
  status?: string;
  /** Fecha de agendado o similar. */
  scheduledDate?: string;
  scheduledTime?: string;
  technicianName?: string;
  /** Cualquier dato extra del flujo (budget, requestData, etc.). */
  [key: string]: unknown;
}

/** Paso del stepper de seguimiento (Figma TrackingScreen). */
export interface FigmaTrackingStep {
  id: number;
  name: string;
  status: 'pending' | 'current' | 'completed';
}
