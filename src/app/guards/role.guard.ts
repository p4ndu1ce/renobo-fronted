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
  const allowedRoles = route.data['roles'] as string[] | undefined;

  // Usar el rol del usuario si está disponible, sino el del signal
  const finalRole = userRoleFromUser || userRole;

  console.log('👮 roleGuard check:', {
    isLoggedIn,
    userRole,
    finalRole,
    allowedRoles,
    url: state.url
  });

  if (!isLoggedIn) {
    console.log('❌ roleGuard: Usuario NO autenticado, redirigiendo a login');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Si la ruta define roles permitidos, comprobar si el usuario tiene uno de ellos
  if (allowedRoles?.length) {
    const allowed = allowedRoles.includes(finalRole ?? '');
    if (allowed) {
      console.log('✅ roleGuard: Rol permitido para esta ruta');
      return true;
    }
    console.log('❌ roleGuard: Rol no permitido, redirigiendo a home');
    router.navigate(['/home']);
    return false;
  }

  // Compatibilidad: rutas sin data.roles (ej. /supervisor) exigen SUPERVISOR
  if (finalRole === 'SUPERVISOR') {
    console.log('✅ roleGuard: Usuario es supervisor, permitiendo acceso');
    return true;
  }

  console.log('❌ roleGuard: Usuario NO tiene rol para esta ruta, redirigiendo a home');
  router.navigate(['/home']);
  return false;
};
