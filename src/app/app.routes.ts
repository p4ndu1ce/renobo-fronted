import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CalculadoraComponent } from './calculadora/calculadora.component';

export const routes: Routes = [
  { path: '', redirectTo: '/calculadora', pathMatch: 'full' },
  { path: 'calculadora', component: CalculadoraComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '**', redirectTo: '/calculadora' }
];
