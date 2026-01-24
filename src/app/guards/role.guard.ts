import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si el usuario es supervisor
  if (authService.isSupervisor()) {
    return true;
  }

  // Si no es supervisor, redirigir a la calculadora
  router.navigate(['/calculadora']);
  return false;
};
