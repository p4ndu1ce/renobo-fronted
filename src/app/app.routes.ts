import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CalculadoraComponent } from './calculadora/calculadora.component';
import { HomeComponent } from './pages/home/home.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { PlaceholderComponent } from './pages/placeholder/placeholder.component';
import { SummaryComponent } from './pages/summary/summary.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'servicios', component: ServiciosComponent },
  { path: 'calculadora', component: CalculadoraComponent },
  { path: 'seguimiento', component: PlaceholderComponent, data: { title: 'Seguimiento' } },
  { path: 'pagos', component: PlaceholderComponent, data: { title: 'Pagos' } },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'resumen', component: SummaryComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard, roleGuard] },
  { path: '**', redirectTo: '/home' }
];
