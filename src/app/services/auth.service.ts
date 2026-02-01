import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

/** Perfil financiero del usuario (para revisión del Supervisor). */
export interface UserFinancialProfile {
  paymentStatus: 'al_dia' | 'atrasado' | 'sin_historial';
  creditsRequested: number;
  isMoroso: boolean;
  creditScore: number | null;
}

/** Perfil de pago / crédito enviado con la solicitud para que el Supervisor apruebe o rechace. */
export interface UserProfile {
  status: 'AL DÍA' | 'ATRASADO' | 'SIN HISTORIAL';
  score: number;
  previousCredits: number;
  isMoroso: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);

  public isLoggedIn = signal<boolean>(this.loadAuthState());
  public currentUser = signal<CurrentUser | null>(this.loadCurrentUser());
  private _token = signal<string | null>(this.loadToken());
  public userRole = signal<string | null>(this.loadUserRole());

  /** Perfil financiero: historial de pagos, score, morosidad. Por defecto hasta que el backend lo provea. */
  public userFinancialProfile = signal<UserFinancialProfile>({
    paymentStatus: 'sin_historial',
    creditsRequested: 0,
    isMoroso: false,
    creditScore: null,
  });

  /** Perfil de crédito simulado: se envía con la solicitud de plan para que el Supervisor decida. */
  public userProfile = signal<UserProfile>({
    status: 'AL DÍA',
    score: 850,
    previousCredits: 2,
    isMoroso: false,
  });

  public isSupervisor = computed(() => this.userRole() === 'SUPERVISOR');

  /** Primer nombre del usuario o 'Invitado' si no hay sesión. */
  public userName = computed(() => {
    const u = this.currentUser();
    const first = u?.name
      ? String(u.name).split(' ')[0]
      : u?.email
        ? String(u.email).split('@')[0]
        : null;
    return first || 'Invitado';
  });

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

  private loadCurrentUser(): CurrentUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem('authToken');
    if (token) {
      const payload = this.decodeJwtPayload(token);
      if (payload) {
        return this.buildUserFromPayload(payload, null);
      }
    }
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Decodifica el payload del JWT (base64url) usando atob.
   * JWT: header.payload.signature → devuelve el objeto parseado del payload.
   */
  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      return JSON.parse(atob(base64)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private buildUserFromPayload(
    payload: Record<string, unknown>,
    fallback: { id?: string; name?: string; email?: string; role?: string } | null
  ): CurrentUser {
    const id = String(payload['sub'] ?? fallback?.id ?? '');
    const name =
      (payload['name'] as string) ??
      (payload['given_name'] as string) ??
      (payload['email'] && String(payload['email']).split('@')[0]) ??
      fallback?.name ??
      (fallback?.email && fallback.email.split('@')[0]) ??
      undefined;
    const email = (payload['email'] as string) ?? fallback?.email;
    const role = (payload['role'] as string) ?? fallback?.role;
    return { id, name, email, role };
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

  private decodeTokenRole(token: string): string | null {
    const p = this.decodeJwtPayload(token);
    return (p?.['role'] as string) ?? null;
  }

  getToken(): string | null {
    return this._token();
  }

  setAuth(token: string, user: { id?: string; name?: string; email?: string; role?: string }) {
    this._token.set(token);
    const payload = this.decodeJwtPayload(token);
    const built = this.buildUserFromPayload(payload ?? {}, user);
    this.currentUser.set(built);
    this.isLoggedIn.set(true);
    this.userRole.set(built.role ?? this.decodeTokenRole(token));
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
    this.userFinancialProfile.set({
      paymentStatus: 'sin_historial',
      creditsRequested: 0,
      isMoroso: false,
      creditScore: null,
    });
    this.userProfile.set({
      status: 'AL DÍA',
      score: 850,
      previousCredits: 2,
      isMoroso: false,
    });
  }
}
