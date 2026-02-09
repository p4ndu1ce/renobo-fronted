import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  description?: string;
}

export type PaymentType = 'inicial' | 'cuota' | 'adelanto';

export interface NextDue {
  amount: number;
  dueDate: string;
}

export interface CreatePaymentBody {
  amount: number;
  type: PaymentType;
  description?: string;
  reference?: string;
  date?: string;
  workId?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/payments`;

  private _payments = signal<PaymentRecord[]>([]);
  private _nextDue = signal<NextDue | null>(null);
  private _loading = signal(false);
  private _submitting = signal(false);

  readonly payments = this._payments.asReadonly();
  readonly nextDue = this._nextDue.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly submitting = this._submitting.asReadonly();

  getPayments(): Observable<PaymentRecord[]> {
    this._loading.set(true);
    return this.http.get<PaymentRecord[]>(this.API).pipe(
      tap((list) => this._payments.set(list ?? [])),
      finalize(() => this._loading.set(false)),
      catchError((err) => {
        console.error('Error al cargar pagos:', err);
        this._payments.set([]);
        return of([]);
      })
    );
  }

  getNextDue(): Observable<{ nextDue: NextDue | null }> {
    return this.http.get<{ nextDue: NextDue | null }>(`${this.API}/next-due`).pipe(
      tap((res) => this._nextDue.set(res?.nextDue ?? null)),
      catchError((err) => {
        console.error('Error al cargar próxima cuota:', err);
        this._nextDue.set(null);
        return of({ nextDue: null });
      })
    );
  }

  createPayment(body: CreatePaymentBody): Observable<{ message: string; id: string; date: string; amount: number; type: PaymentType }> {
    this._submitting.set(true);
    return this.http
      .post<{ message: string; id: string; date: string; amount: number; type: PaymentType }>(this.API, body)
      .pipe(
        tap((res) => {
          const list = this._payments();
          this._payments.set([
            { id: res.id, date: res.date, amount: res.amount, description: body.description },
            ...list,
          ]);
        }),
        finalize(() => this._submitting.set(false)),
        catchError((err) => {
          console.error('Error al registrar pago:', err);
          throw err;
        })
      );
  }
}
