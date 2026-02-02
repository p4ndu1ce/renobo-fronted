import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, tap, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

/**
 * Interceptor: solo añade Authorization si hay token; no usa AuthService (evita dependencia circular).
 * No hay switchMap/filter que esperen token de forma infinita: si no hay token, se reenvía la petición sin header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('Interceptor: Iniciando petición a', req.url);

  const platformId = inject(PLATFORM_ID);
  const toastService = inject(ToastService);

  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  if (!req.url.includes('execute-api')) {
    return next(req);
  }

  const token = localStorage.getItem('authToken');
  const request = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return next(request).pipe(
    tap({
      next: () => console.log('Interceptor: Respuesta recibida de', req.url),
      error: (err) => console.log('Interceptor: Error en petición a', req.url, err?.status ?? err?.message),
    }),
    catchError((err) => {
      const status = err.status;
      const isHttpError = status != null && status >= 400;
      const isNetworkError = status == null;
      if (isHttpError || isNetworkError) {
        const message =
          err.error?.message ??
          err.error?.error ??
          err.message ??
          'Error de conexión';
        toastService.show(message, 'error');
      }
      return throwError(() => err);
    })
  );
};
