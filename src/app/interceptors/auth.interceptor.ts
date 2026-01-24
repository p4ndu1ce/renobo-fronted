import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo ejecutar en el navegador
  const platformId = inject(PLATFORM_ID);
  
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  // Solo añadir token a peticiones a AWS API Gateway
  if (!req.url.includes('execute-api')) {
    return next(req);
  }

  // Obtener token del localStorage
  const token = localStorage.getItem('authToken');

  // Si no hay token, continuar sin modificar la petición
  if (!token) {
    return next(req);
  }

  // Clonar la petición y añadir el header Authorization
  const clonedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonedRequest);
};
