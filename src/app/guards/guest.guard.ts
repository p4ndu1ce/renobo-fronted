import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  
  // En el servidor (SSR), permitir el acceso
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Si el usuario está autenticado, redirigir según su rol
  if (authService.isLoggedIn()) {
    // Si es supervisor, redirigir al dashboard
    if (authService.isSupervisor()) {
      router.navigate(['/admin']);
      return false;
    }
    
    // Si no es supervisor, redirigir a la calculadora
    router.navigate(['/calculadora']);
    return false;
  }
  
  // Si no está autenticado, permitir el acceso a login/register
  return true;
};
