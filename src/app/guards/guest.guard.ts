import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/** Esperar un tick para que AuthService/localStorage esté inicializado (en móvil es más lento). */
const AUTH_READY_DELAY_MS = 50;

export const guestGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const runCheck = () => {
      if (authService.isLoggedIn()) {
        if (authService.isSupervisor()) {
          router.navigate(['/supervisor']);
          resolve(false);
          return;
        }
        if (authService.isPartner()) {
          console.log('[guestGuard] logueado partner → redirigiendo a /partner', { url: state.url });
          router.navigate(['/partner']);
          resolve(false);
          return;
        }
        console.log('[guestGuard] logueado → redirigiendo a /home', { url: state.url });
        router.navigate(['/home']);
        resolve(false);
        return;
      }
      resolve(true);
    };

    setTimeout(runCheck, AUTH_READY_DELAY_MS);
  });
};
