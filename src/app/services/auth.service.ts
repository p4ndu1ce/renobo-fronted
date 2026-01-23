import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  
  // En un caso real, esto vendría de un token en localStorage o de AWS Cognito
  public isLoggedIn = signal<boolean>(this.loadAuthState()); 

  constructor() {
    // Sincronizamos el signal con localStorage cuando cambia (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const loggedIn = this.isLoggedIn();
        if (loggedIn) {
          localStorage.setItem('isLoggedIn', 'true');
        } else {
          localStorage.removeItem('isLoggedIn');
        }
      });
    }
  }

  private loadAuthState(): boolean {
    // Cargamos el estado desde localStorage al iniciar (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  }

  // Simulamos un login para pruebas
  login() { 
    this.isLoggedIn.set(true); 
  }
  
  logout() { 
    this.isLoggedIn.set(false); 
  }
}
