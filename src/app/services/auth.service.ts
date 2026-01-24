import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  
  public isLoggedIn = signal<boolean>(this.loadAuthState());
  public currentUser = signal<{ id: string; email?: string; role?: string } | null>(this.loadCurrentUser());
  private _token = signal<string | null>(this.loadToken());
  public userRole = signal<string | null>(this.loadUserRole());

  public isSupervisor = computed(() => this.userRole() === 'SUPERVISOR');

  constructor() {
    console.log('🔧 AuthService constructor - Estado inicial:', {
      isLoggedIn: this.isLoggedIn(),
      hasToken: !!this._token(),
      hasUser: !!this.currentUser(),
      userRole: this.userRole()
    });
    
    // Sincronizamos el signal con localStorage cuando cambia (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const loggedIn = this.isLoggedIn();
        const user = this.currentUser();
        const token = this._token();
        const currentRole = this.userRole();
        
        if (loggedIn && user) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('currentUser', JSON.stringify(user));
          
          // Si el usuario tiene rol, usarlo directamente (más confiable que decodificar)
          if (user.role && user.role !== currentRole) {
            this.userRole.set(user.role);
          }
        } else {
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('currentUser');
        }
        
        if (token) {
          localStorage.setItem('authToken', token);
          // Solo decodificar el rol del token si no tenemos uno del usuario
          if (!currentRole || !user?.role) {
            const decodedRole = this.decodeTokenRole(token);
            if (decodedRole) {
              this.userRole.set(decodedRole);
            }
          }
        } else {
          localStorage.removeItem('authToken');
          this.userRole.set(null);
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

  private loadUserRole(): string | null {
    const token = this.loadToken();
    if (token) {
      return this.decodeTokenRole(token);
    }
    return null;
  }

  /**
   * Decodifica el JWT y extrae el rol del payload
   * Un JWT tiene formato: header.payload.signature
   * Solo necesitamos decodificar el payload (segunda parte)
   */
  private decodeTokenRole(token: string): string | null {
    try {
      // Dividir el token en sus partes
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decodificar el payload (segunda parte)
      // JWT usa base64url encoding, necesitamos reemplazar caracteres especiales y agregar padding
      const payload = parts[1];
      // Reemplazar caracteres base64url a base64 estándar
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar padding si es necesario
      while (base64.length % 4) {
        base64 += '=';
      }
      const decodedPayload = atob(base64);
      const parsedPayload = JSON.parse(decodedPayload);

      // Extraer el rol del payload
      return parsedPayload.role || null;
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  }

  getToken(): string | null {
    return this._token();
  }

  setAuth(token: string, user: { id: string; email?: string; role?: string }) {
    // Establecer todo de forma síncrona para evitar problemas de timing
    this._token.set(token);
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
    
    // Usar el rol del usuario si está disponible, sino decodificarlo del token
    const role = user.role || this.decodeTokenRole(token);
    this.userRole.set(role);
    
    // Debug: Log para verificar
    console.log('AuthService.setAuth:', {
      hasToken: !!token,
      userRole: user.role,
      decodedRole: this.decodeTokenRole(token),
      finalRole: role,
      isSupervisor: role === 'SUPERVISOR'
    });
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
    this.userRole.set(null);
  }
}
