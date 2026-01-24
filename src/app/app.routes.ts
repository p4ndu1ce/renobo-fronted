import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CalculadoraComponent } from './calculadora/calculadora.component';
import { SummaryComponent } from './pages/summary/summary.component';

export const routes: Routes = [
  { path: '', redirectTo: '/calculadora', pathMatch: 'full' },
  { path: 'calculadora', component: CalculadoraComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'resumen', component: SummaryComponent },
  { path: '**', redirectTo: '/calculadora' }
];
