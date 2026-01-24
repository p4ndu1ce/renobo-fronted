import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  
  // En el servidor (SSR), permitir el acceso y dejar que el cliente maneje la redirección
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  
  console.log('🚀 authGuard EJECUTÁNDOSE (CLIENTE) para:', state.url);
  
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const isLoggedIn = authService.isLoggedIn();
  const token = authService.getToken();
  const currentUser = authService.currentUser();
  
  console.log('🔐 authGuard check:', {
    isLoggedIn,
    hasToken: !!token,
    hasUser: !!currentUser,
    userRole: currentUser?.role,
    url: state.url
  });
  
  if (isLoggedIn) {
    console.log('✅ authGuard: Usuario autenticado, permitiendo acceso');
    return true;
  }

  // Redirigir a login si no está autenticado
  console.log('❌ authGuard: Usuario NO autenticado, redirigiendo a login');
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
