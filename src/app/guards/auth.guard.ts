import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

const GUARD_TIMEOUT_MS = 5000;
/** Esperar un tick para que AuthService/localStorage esté inicializado (en móvil es más lento). */
const AUTH_READY_DELAY_MS = 50;

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn('[authGuard] timeout → redirigiendo a /login', { url: state.url });
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      resolve(false);
    }, GUARD_TIMEOUT_MS);

    const runCheck = () => {
      const isLoggedIn = authService.isLoggedIn();
      const hasToken = !!authService.getToken();
      const currentUser = authService.currentUser();

      console.log('[authGuard] check', { url: state.url, isLoggedIn, hasToken, hasUser: !!currentUser });

      if (isLoggedIn) {
        clearTimeout(timeoutId);
        resolve(true);
        return;
      }

      clearTimeout(timeoutId);
      console.log('[authGuard] no autenticado → redirigiendo a /login', { url: state.url });
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      resolve(false);
    };

    // Esperar a que el estado de auth esté inicializado (localStorage en móvil puede ser asíncrono)
    setTimeout(runCheck, AUTH_READY_DELAY_MS);
  });
};
