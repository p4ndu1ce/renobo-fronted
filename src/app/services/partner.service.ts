import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, finalize, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';
import { WorkService } from './work.service';
import type { Partner } from '../models/types';
import type { Work, WorkItem } from './work.service';
import type { TakePhotoResult } from './camera.service';

export type { Partner };

/** Obra asignada al partner (Pendiente de Material). */
export interface PartnerJob {
  id: string;
  workId: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  assignedAt: string;
  expiresAt: string | null;
  clientAddress: string;
  requestCode?: string;
  /** Coordenadas de la obra (para búsqueda de ferreterías cercanas). Si no vienen del backend, el botón se deshabilita. */
  coordinates?: { lat: number; lng: number };
  /** Ítems de materiales que debe proveer este partner. */
  items: WorkItem[];
}

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private readonly authService = inject(AuthService);
  private readonly workService = inject(WorkService);

  private readonly API_URL = `${environment.apiUrl}/partners`;
  private readonly WORKS_API_URL = `${environment.apiUrl}/works`;

  private _partners = signal<Partner[]>([]);
  readonly partners = this._partners.asReadonly();

  /** Obras asignadas al partner (mapeadas a PartnerJob). */
  private _jobs = signal<PartnerJob[]>([]);
  readonly jobs = this._jobs.asReadonly();

  /** Solo obras activas: pendientes o en curso (no completadas ni expiradas). */
  activeJobs = computed(() =>
    this._jobs().filter((j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS')
  );

  private _jobsLoading = signal(false);
  readonly jobsLoading = this._jobsLoading.asReadonly();

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

  /**
   * Carga las obras asignadas al partner desde el backend (GET /works?partnerId=xxx).
   * Debe llamarse con el id del usuario logueado cuando su rol es PARTNER.
   */
  loadAssignedJobs(partnerId: string): void {
    if (!partnerId) {
      this._jobs.set([]);
      return;
    }
    this._jobsLoading.set(true);
    this.workService.getWorksByPartnerId(partnerId).subscribe({
      next: (works) => {
        const jobs = works.map((w) => this.workToPartnerJob(w, partnerId));
        this._jobs.set(jobs);
      },
      error: () => this._jobs.set([]),
      complete: () => this._jobsLoading.set(false),
    });
  }

  private workToPartnerJob(work: Work, partnerId: string): PartnerJob {
    const itemsForPartner = (work.items ?? []).filter((i) => i.partnerId === partnerId);
    const expiresAt = work.partnerDeadline ?? null;
    const now = Date.now();
    const expired = expiresAt ? new Date(expiresAt).getTime() < now : false;
    let status: PartnerJob['status'] = 'PENDING';
    if (work.status === 'IN_PROGRESS') status = 'IN_PROGRESS';
    else if (work.status === 'FINISHED') status = 'COMPLETED';
    else if (expired) status = 'EXPIRED';
    else status = 'PENDING';

    const clientAddress =
      (work as { ubicacion?: string }).ubicacion?.trim() || 'Dirección de la obra (por definir)';

    const raw = work as { latitude?: number; longitude?: number; coordinates?: { lat: number; lng: number } };
    const coordinates =
      raw.coordinates ?? (raw.latitude != null && raw.longitude != null ? { lat: raw.latitude, lng: raw.longitude } : undefined);

    return {
      id: work.id,
      workId: work.id,
      title: work.title ?? 'Sin título',
      description: work.description ?? '',
      status,
      assignedAt: work.createdAt ?? new Date().toISOString(),
      expiresAt,
      clientAddress,
      requestCode: work.requestCode,
      ...(coordinates && { coordinates }),
      items: itemsForPartner,
    };
  }

  /**
   * Sube la foto del handshake (inicio o finalización) al backend.
   * Recibe el resultado de CameraService.takePhoto() y envía multipart/form-data.
   */
  uploadHandshakePhoto(
    workId: string,
    action: 'START' | 'FINISH',
    photo: TakePhotoResult
  ): Observable<{ message: string }> {
    const formData = new FormData();
    const blob = this.base64ToBlob(photo.base64Data, 'image/jpeg');
    formData.append('photo', blob, `handshake_${action.toLowerCase()}_${Date.now()}.jpeg`);
    formData.append('action', action);
    if (photo.location) {
      formData.append('latitude', String(photo.location.lat));
      formData.append('longitude', String(photo.location.lng));
    }
    return this.http.post<{ message: string }>(`${this.WORKS_API_URL}/${workId}/partner-handshake`, formData).pipe(
      catchError((err) => {
        console.error('[PartnerService] Error al subir foto handshake:', err);
        return throwError(() => err?.error?.message ?? err?.message ?? new Error('Error al subir la evidencia.'));
      })
    );
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mimeType });
  }

  /**
   * Calcula el tiempo restante hasta expiresAt (para el cronómetro en la UI).
   * isCritical = true si quedan menos de 2 horas.
   */
  calculateTimeRemaining(expiresAt: string | null): {
    hours: number;
    minutes: number;
    seconds: number;
    isCritical: boolean;
  } {
    if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, isCritical: false };
    const now = new Date().getTime();
    const expiration = new Date(expiresAt).getTime();
    const diff = expiration - now;

    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, isCritical: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const isCritical = hours < 2;

    return { hours, minutes, seconds, isCritical };
  }
}
