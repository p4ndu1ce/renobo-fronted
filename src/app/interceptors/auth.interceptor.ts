import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
