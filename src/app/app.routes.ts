import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { CalculadoraComponent } from './calculadora/calculadora.component';
import { HomeComponent } from './pages/home/home.component';
import { PlanSelectionComponent } from './pages/plan-selection/plan-selection.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { PlaceholderComponent } from './pages/placeholder/placeholder.component';
import { SummaryComponent } from './pages/summary/summary.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { EngineerDashboardComponent } from './pages/engineer/engineer-dashboard.component';
import { TechnicalCalculatorComponent } from './pages/engineer/technical-calculator.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'plan-selection', component: PlanSelectionComponent, canActivate: [authGuard] },
      { path: 'servicios', component: ServiciosComponent },
      { path: 'calculadora', component: CalculadoraComponent },
      { path: 'seguimiento', component: PlaceholderComponent, data: { title: 'Seguimiento' } },
      { path: 'pagos', component: PlaceholderComponent, data: { title: 'Pagos' } },
      { path: 'resumen', component: SummaryComponent, canActivate: [authGuard] },
      { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
      { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['SUPERVISOR'] } },
      { path: 'engineer', component: EngineerDashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
      { path: 'engineer/visit/:workId', component: TechnicalCalculatorComponent, canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
    ],
  },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: '/home' },
];
