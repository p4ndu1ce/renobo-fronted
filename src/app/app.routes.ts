import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  // Splash (pantalla de bienvenida)
  { path: 'splash', loadComponent: () => import('./components/splash-screen/splash-screen.component').then((m) => m.SplashScreenComponent), data: { animation: 'Splash' } },
  // Layout principal: shell con navbar; hijos en lazy
  {
    path: '',
    loadComponent: () =>
      import('./components/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
      { path: 'categories', loadComponent: () => import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent), data: { title: 'Categorías' } },
      { path: 'request', loadComponent: () => import('./pages/plan-selection/plan-selection.component').then((m) => m.PlanSelectionComponent), canActivate: [authGuard] },
      { path: 'plan-selection', loadComponent: () => import('./pages/plan-selection/plan-selection.component').then((m) => m.PlanSelectionComponent), canActivate: [authGuard] },
      { path: 'budget', loadComponent: () => import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent), data: { title: 'Presupuesto' } },
      { path: 'tracking', loadComponent: () => import('./pages/seguimiento/service-detail.component').then((m) => m.ServiceDetailComponent), data: { title: 'Seguimiento' } },
      { path: 'chat', loadComponent: () => import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent), data: { title: 'Chat' } },
      { path: 'financing', loadComponent: () => import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent), data: { title: 'Financiación' } },
      { path: 'financing-form', loadComponent: () => import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent), data: { title: 'Solicitud de financiación' } },
      { path: 'servicios', loadComponent: () => import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent) },
      { path: 'request-success', loadComponent: () => import('./pages/request-success/request-success.component').then((m) => m.RequestSuccessComponent), data: { title: 'Solicitud enviada' } },
      { path: 'calculadora', loadComponent: () => import('./calculadora/calculadora.component').then((m) => m.CalculadoraComponent) },
      { path: 'seguimiento', loadComponent: () => import('./pages/seguimiento/service-detail.component').then((m) => m.ServiceDetailComponent), data: { title: 'Seguimiento' } },
      { path: 'pagos', loadComponent: () => import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent), data: { title: 'Pagos' } },
      { path: 'resumen', loadComponent: () => import('./pages/summary/summary.component').then((m) => m.SummaryComponent), canActivate: [authGuard] },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent), canActivate: [authGuard] },
      { path: 'admin', loadComponent: () => import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['SUPERVISOR'] } },
      { path: 'supervisor', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'engineer', loadComponent: () => import('./pages/engineer/engineer-dashboard.component').then((m) => m.EngineerDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
      { path: 'engineer/visit/:workId', loadComponent: () => import('./pages/engineer/technical-calculator.component').then((m) => m.TechnicalCalculatorComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
    ],
  },

  { path: 'login', loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent), canActivate: [guestGuard], data: { animation: 'Login' } },
  { path: 'register', loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent), canActivate: [guestGuard] },

  { path: '**', redirectTo: 'home' },
];
