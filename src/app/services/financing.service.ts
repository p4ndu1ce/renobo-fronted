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

@Injectable({ providedIn: 'root' })
export class FinancingService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/financing-requests`;

  createRequest(payload: CreateFinancingRequestPayload): Observable<CreateFinancingRequestResponse> {
    return this.http.post<CreateFinancingRequestResponse>(this.API, payload);
  }
}
