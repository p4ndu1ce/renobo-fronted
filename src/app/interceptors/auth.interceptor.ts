import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

/** Evento que AuthService escucha para limpiar estado en memoria cuando el interceptor detecta 401. */
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

/**
 * Interceptor: solo añade Authorization si hay token; no usa AuthService (evita dependencia circular).
 * Si la API devuelve 401, se limpia la sesión y se redirige a login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const toastService = inject(ToastService);
  const router = inject(Router);

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
      next: () => {},
      error: (err) => {
        if (err?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('currentUser');
          window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
          toastService.show('Sesión expirada o no válida. Inicia sesión de nuevo.', 'error');
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      },
    }),
    catchError((err) => {
      const status = err.status;
      if (status === 401) {
        // Ya se manejó en tap (limpieza + redirect); no mostrar toast duplicado
        return throwError(() => err);
      }
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
