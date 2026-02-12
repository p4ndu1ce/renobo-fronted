import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateFinancingRequestPayload {
  fullName: string;
  email: string;
  phone: string;
  planId: string;
  category: string;
  description: string;
  budget: string;
}

export interface CreateFinancingRequestResponse {
  message: string;
  id: string;
  requestCode: string;
}

export type FinancingRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FinancingRequestListItem {
  id: string;
  requestCode: string;
  status: FinancingRequestStatus;
  planId: string;
  category: string;
  budget: string;
  createdAt: string;
}

export interface GetMyFinancingRequestsResponse {
  requests: FinancingRequestListItem[];
}

/** Item de solicitud para el panel del supervisor (incluye datos del solicitante). */
export interface AdminFinancingRequestItem extends FinancingRequestListItem {
  fullName: string;
  email: string;
  phone: string;
  description: string;
}

export interface GetAdminFinancingRequestsResponse {
  requests: AdminFinancingRequestItem[];
}

@Injectable({ providedIn: 'root' })
export class FinancingService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/financing-requests`;
  private readonly adminApi = `${environment.apiUrl}/admin/financing-requests`;

  createRequest(payload: CreateFinancingRequestPayload): Observable<CreateFinancingRequestResponse> {
    return this.http.post<CreateFinancingRequestResponse>(this.API, payload);
  }

  getMyRequests(): Observable<GetMyFinancingRequestsResponse> {
    return this.http.get<GetMyFinancingRequestsResponse>(this.API);
  }

  /** Lista todas las solicitudes de financiamiento (solo SUPERVISOR). */
  getAdminRequests(): Observable<GetAdminFinancingRequestsResponse> {
    return this.http.get<GetAdminFinancingRequestsResponse>(this.adminApi);
  }

  approveRequest(requestId: string): Observable<{ message: string; workId: string; requestCode: string }> {
    return this.http.post<{ message: string; workId: string; requestCode: string }>(
      `${this.API}/${requestId}/approve`,
      {}
    );
  }

  rejectRequest(requestId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/${requestId}/reject`, {});
  }
}
