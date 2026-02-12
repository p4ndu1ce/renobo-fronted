import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AUTH_SESSION_EXPIRED_EVENT } from '../interceptors/auth.interceptor';
import { Observable, of } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  /** Teléfono (desde perfil GET /auth/user/me o registro). */
  phone?: string;
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

/** Respuesta esperada de GET /user/{id} (rol, credit score, historial financiero, nombre, email, teléfono). */
export interface UserProfileApiResponse {
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
  creditScore?: number;
  status?: string;
  previousCredits?: number;
  isMoroso?: boolean;
  paymentStatus?: string;
  creditsRequested?: number;
}

const DEFAULT_USER_PROFILE: UserProfile = {
  status: 'AL DÍA',
  score: 0,
  previousCredits: 0,
  isMoroso: false,
};

const DEFAULT_FINANCIAL_PROFILE: UserFinancialProfile = {
  paymentStatus: 'sin_historial',
  creditsRequested: 0,
  isMoroso: false,
  creditScore: null,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  public isLoggedIn = signal<boolean>(this.loadAuthState());
  public currentUser = signal<CurrentUser | null>(this.loadCurrentUser());
  private _token = signal<string | null>(this.loadToken());
  public userRole = signal<string | null>(this.loadUserRole());

  /** true mientras se carga el perfil del usuario desde la API. */
  public isLoading = signal(false);

  /** Perfil financiero: obtenido de GET /user/{id}. */
  public userFinancialProfile = signal<UserFinancialProfile>({ ...DEFAULT_FINANCIAL_PROFILE });

  /** Perfil de crédito: obtenido de GET /user/{id} (rol, score, historial). */
  public userProfile = signal<UserProfile>({ ...DEFAULT_USER_PROFILE });

  public isSupervisor = computed(() => this.userRole() === 'SUPERVISOR');
  public isEngineer = computed(() => this.userRole() === 'ENGINEER');
  public isPartner = computed(() => this.userRole() === 'PARTNER');

  /**
   * ID del ingeniero para filtrar obras asignadas.
   * Si el usuario tiene rol ENGINEER, devuelve su id (o 'engineer-simulado' para pruebas).
   */
  public engineerId = computed(() => {
    const role = this.userRole();
    const user = this.currentUser();
    if (role === 'ENGINEER') {
      return user?.id ?? user?.email ?? 'engineer-simulado';
    }
    return null;
  });

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

  /** Alias de currentUser para uso en templates (ej. user()?.name). */
  public user = this.currentUser;

  /** Datos opcionales al navegar (ej. desde Actividad Reciente a detalle). */
  public navigationData = signal<unknown>(null);

  constructor() {
    console.log('🔧 AuthService constructor - Estado inicial:', {
      isLoggedIn: this.isLoggedIn(),
      hasToken: !!this._token(),
      hasUser: !!this.currentUser(),
      userRole: this.userRole()
    });

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, () => this.logout());
    }

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

  /** Solo consideramos sesión válida si hay token; evita peticiones 401 por datos viejos en localStorage. */
  private loadAuthState(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const hasFlag = localStorage.getItem('isLoggedIn') === 'true';
      const hasToken = !!localStorage.getItem('authToken');
      return hasFlag && hasToken;
    }
    return false;
  }

  private loadCurrentUser(): CurrentUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const userJson = localStorage.getItem('currentUser');
    const stored = userJson ? (JSON.parse(userJson) as CurrentUser) : null;
    const payload = this.decodeJwtPayload(token);
    if (payload) {
      const built = this.buildUserFromPayload(payload, stored ?? null);
      return {
        ...built,
        name: stored?.name ?? built.name,
        email: stored?.email ?? built.email,
        phone: stored?.phone ?? built.phone,
      };
    }
    return stored;
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
    fallback: { id?: string; name?: string; email?: string; role?: string; phone?: string } | null
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
    const phone = (payload['phone'] as string) ?? fallback?.phone;
    return { id, name, email, role, phone };
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
    // Escribir en localStorage de inmediato para que la siguiente petición (p. ej. loadUserProfile)
    // ya tenga el token; el effect también lo hace, pero de forma asíncrona.
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify(built));
    }
  }

  /**
   * Obtiene rol y perfil financiero desde auth-service (GET auth/user/me).
   * Llamar tras el login para reemplazar datos por defecto. El backend identifica al usuario por el token.
   */
  loadUserProfile(_userId?: string): Observable<UserProfile> {
    this.isLoading.set(true);
    const url = `${environment.authApiUrl}/auth/user/me`;
    return this.http.get<UserProfileApiResponse>(url).pipe(
      tap((res) => {
        const status = (res.status ?? 'AL DÍA').toUpperCase().replace(/\s/g, ' ') as UserProfile['status'];
        this.userProfile.set({
          status: status === 'AL DÍA' || status === 'ATRASADO' || status === 'SIN HISTORIAL' ? status : 'AL DÍA',
          score: res.creditScore ?? 0,
          previousCredits: res.previousCredits ?? 0,
          isMoroso: res.isMoroso ?? false,
        });
        this.userFinancialProfile.set({
          paymentStatus: (res.paymentStatus as UserFinancialProfile['paymentStatus']) ?? 'sin_historial',
          creditsRequested: res.creditsRequested ?? 0,
          isMoroso: res.isMoroso ?? false,
          creditScore: res.creditScore ?? null,
        });
        if (res.role) {
          this.userRole.set(res.role);
        }
        const u = this.currentUser();
        if (u) {
          this.currentUser.set({
            ...u,
            ...(res.role && { role: res.role }),
            ...(res.name != null && { name: res.name }),
            ...(res.email != null && { email: res.email }),
            ...(res.phone != null && { phone: res.phone }),
          });
        }
      }),
      map((res): UserProfile => ({
        status: (res.status === 'ATRASADO' ? 'ATRASADO' : res.status === 'SIN HISTORIAL' ? 'SIN HISTORIAL' : 'AL DÍA') as UserProfile['status'],
        score: res.creditScore ?? 0,
        previousCredits: res.previousCredits ?? 0,
        isMoroso: res.isMoroso ?? false,
      })),
      finalize(() => this.isLoading.set(false)),
      catchError((err) => {
        const status = err?.status;
        if (status !== 403 && status !== 404) {
          console.error('Error al cargar perfil de usuario:', err);
        }
        return of(DEFAULT_USER_PROFILE);
      })
    );
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
    this.userFinancialProfile.set({ ...DEFAULT_FINANCIAL_PROFILE });
    this.userProfile.set({ ...DEFAULT_USER_PROFILE });
  }
}
