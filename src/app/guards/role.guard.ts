import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  
  // En el servidor (SSR), permitir el acceso y dejar que el cliente maneje la redirección
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  
  console.log('🚀 roleGuard EJECUTÁNDOSE (CLIENTE) para:', state.url);
  
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Verificar primero que esté autenticado
  const isLoggedIn = authService.isLoggedIn();
  const userRole = authService.userRole();
  const currentUser = authService.currentUser();
  const userRoleFromUser = currentUser?.role;
  
  // Usar el rol del usuario si está disponible, sino el del signal
  const finalRole = userRoleFromUser || userRole;
  const isSupervisor = finalRole === 'SUPERVISOR';

  console.log('👮 roleGuard check:', {
    isLoggedIn,
    userRole,
    userRoleFromUser,
    finalRole,
    isSupervisor,
    currentUser,
    url: state.url
  });

  if (!isLoggedIn) {
    console.log('❌ roleGuard: Usuario NO autenticado, redirigiendo a login');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  if (isSupervisor) {
    console.log('✅ roleGuard: Usuario es supervisor, permitiendo acceso');
    return true;
  }

  // Si no es supervisor, redirigir a la calculadora
  console.log('❌ roleGuard: Usuario NO es supervisor, redirigiendo a calculadora');
  router.navigate(['/calculadora']);
  return false;
};
