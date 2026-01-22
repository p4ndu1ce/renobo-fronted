import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // En un caso real, esto vendría de un token en localStorage o de AWS Cognito
  public isLoggedIn = signal<boolean>(false); 

  // Simulamos un login para pruebas
  login() { this.isLoggedIn.set(true); }
  logout() { this.isLoggedIn.set(false); }
}
