import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  
  public isLoggedIn = signal<boolean>(this.loadAuthState());
  public currentUser = signal<{ id: string; email?: string; role?: string } | null>(this.loadCurrentUser());
  private _token = signal<string | null>(this.loadToken());

  constructor() {
    // Sincronizamos el signal con localStorage cuando cambia (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const loggedIn = this.isLoggedIn();
        const user = this.currentUser();
        const token = this._token();
        
        if (loggedIn && user) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('currentUser');
        }
        
        if (token) {
          localStorage.setItem('authToken', token);
        } else {
          localStorage.removeItem('authToken');
        }
      });
    }
  }

  private loadAuthState(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  }

  private loadCurrentUser(): { id: string; email?: string; role?: string } | null {
    if (isPlatformBrowser(this.platformId)) {
      const userJson = localStorage.getItem('currentUser');
      return userJson ? JSON.parse(userJson) : null;
    }
    return null;
  }

  private loadToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  getToken(): string | null {
    return this._token();
  }

  setAuth(token: string, user: { id: string; email?: string; role?: string }) {
    this._token.set(token);
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
  }
  
  login(email?: string) { 
    // Método legacy para compatibilidad - ahora se usa setAuth después de llamar al backend
    this.isLoggedIn.set(true);
    this.currentUser.set({ 
      id: `user-${Date.now()}`, 
      email: email || 'usuario@renobo.com' 
    });
  }
  
  logout() { 
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this._token.set(null);
  }
}
