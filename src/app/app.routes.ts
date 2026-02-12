import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

  // Pantallas sin shell (sin header ni bottom navbar)
  { path: 'splash', loadComponent: () => import('./components/splash-screen/splash-screen.component').then((m) => m.SplashScreenComponent), data: { animation: 'Splash' } },
  { path: 'login', loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent), canActivate: [guestGuard], data: { animation: 'Login' } },
  { path: 'register', loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent), canActivate: [guestGuard] },

  // Solo rutas accesibles desde el bottom navbar: llevan main layout (header + bottom nav)
  {
    path: '',
    loadComponent: () =>
      import('./components/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent), canActivate: [authGuard] },
      { path: 'categories', loadComponent: () => import('./pages/categories/categories.component').then((m) => m.CategoriesComponent), canActivate: [authGuard, roleGuard], data: { title: 'Categorías', roles: ['CLIENT'] } },
      { path: 'tracking', loadComponent: () => import('./pages/seguimiento/service-detail.component').then((m) => m.ServiceDetailComponent), canActivate: [authGuard, roleGuard], data: { title: 'Seguimiento', roles: ['CLIENT'] } },
      { path: 'engineer', loadComponent: () => import('./pages/engineer/engineer-dashboard.component').then((m) => m.EngineerDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
      { path: 'supervisor', loadComponent: () => import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['SUPERVISOR'] } },
      { path: 'partner', loadComponent: () => import('./pages/partner-tracking/partner-tracking.component').then((m) => m.PartnerTrackingComponent), canActivate: [authGuard, roleGuard], data: { title: 'Panel Partner', roles: ['PARTNER'] } },
    ],
  },

  // Rutas full-screen (sin main layout): flujos que no son tabs del bottom nav
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'financing', loadComponent: () => import('./pages/financing/financing-screen.component').then((m) => m.FinancingScreenComponent), canActivate: [authGuard, roleGuard], data: { title: 'Financiación', roles: ['CLIENT'] } },
  { path: 'financing-tracking', loadComponent: () => import('./pages/financing-tracking/financing-tracking.component').then((m) => m.FinancingTrackingComponent), canActivate: [authGuard, roleGuard], data: { title: 'Seguimiento de Financiamiento', roles: ['CLIENT'] } },
  { path: 'financing-form', loadComponent: () => import('./pages/financing-form/financing-form.component').then((m) => m.FinancingFormComponent), canActivate: [authGuard, roleGuard], data: { title: 'Solicitud de financiación', roles: ['CLIENT'] } },
  { path: 'request-success', loadComponent: () => import('./pages/request-success/request-success.component').then((m) => m.RequestSuccessComponent), canActivate: [authGuard, roleGuard], data: { title: 'Solicitud enviada', roles: ['CLIENT'] } },
  { path: 'calculadora', loadComponent: () => import('./calculadora/calculadora.component').then((m) => m.CalculadoraComponent) },
  { path: 'engineer/visit/:workId', loadComponent: () => import('./pages/engineer/technical-calculator.component').then((m) => m.TechnicalCalculatorComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat-screen.component').then((m) => m.ChatScreenComponent), canActivate: [authGuard, roleGuard], data: { title: 'Chat', roles: ['CLIENT', 'ENGINEER', 'PARTNER'] } },
  { path: 'rating', loadComponent: () => import('./pages/rating/rating-screen.component').then((m) => m.RatingScreenComponent), canActivate: [authGuard, roleGuard], data: { title: 'Calificar Servicio', roles: ['CLIENT'] } },
  { path: 'service-request', loadComponent: () => import('./pages/service-request/service-request.component').then((m) => m.ServiceRequestComponent), canActivate: [authGuard, roleGuard], data: { title: 'Solicitar Servicio', roles: ['CLIENT'] } },
  { path: 'servicios', loadComponent: () => import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent), canActivate: [authGuard, roleGuard], data: { roles: ['CLIENT'] } },
  { path: 'pagos', loadComponent: () => import('./pages/pagos/pagos.component').then((m) => m.PagosComponent), canActivate: [authGuard, roleGuard], data: { title: 'Historial de Pagos', roles: ['CLIENT'] } },
  { path: 'resumen', loadComponent: () => import('./pages/summary/summary.component').then((m) => m.SummaryComponent), canActivate: [authGuard, roleGuard], data: { roles: ['CLIENT'] } },

  { path: '**', redirectTo: 'home' },
];
