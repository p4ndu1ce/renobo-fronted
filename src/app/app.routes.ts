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
      { path: 'home', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
      { path: 'categories', loadComponent: () => import('./pages/categories/categories.component').then((m) => m.CategoriesComponent), data: { title: 'Categorías' } },
      { path: 'seguimiento', loadComponent: () => import('./pages/seguimiento/service-detail.component').then((m) => m.ServiceDetailComponent), data: { title: 'Seguimiento' } },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent), canActivate: [authGuard] },
      { path: 'engineer', loadComponent: () => import('./pages/engineer/engineer-dashboard.component').then((m) => m.EngineerDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
      { path: 'admin', loadComponent: () => import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['SUPERVISOR'] } },
      { path: 'supervisor', redirectTo: 'admin', pathMatch: 'full' },
    ],
  },

  // Rutas full-screen (sin main layout): flujos que no son tabs del bottom nav
  { path: 'financing', loadComponent: () => import('./pages/financing/financing-screen.component').then((m) => m.FinancingScreenComponent), data: { title: 'Financiación' } },
  { path: 'financing-form', loadComponent: () => import('./pages/financing-form/financing-form.component').then((m) => m.FinancingFormComponent), data: { title: 'Solicitud de financiación' } },
  { path: 'plan-selection', loadComponent: () => import('./pages/plan-selection/plan-selection.component').then((m) => m.PlanSelectionComponent), canActivate: [authGuard] },
  { path: 'request', loadComponent: () => import('./pages/plan-selection/plan-selection.component').then((m) => m.PlanSelectionComponent), canActivate: [authGuard] },
  { path: 'request-success', loadComponent: () => import('./pages/request-success/request-success.component').then((m) => m.RequestSuccessComponent), data: { title: 'Solicitud enviada' } },
  { path: 'calculadora', loadComponent: () => import('./calculadora/calculadora.component').then((m) => m.CalculadoraComponent) },
  { path: 'tracking', redirectTo: 'seguimiento', pathMatch: 'full' },
  { path: 'engineer/visit/:workId', loadComponent: () => import('./pages/engineer/technical-calculator.component').then((m) => m.TechnicalCalculatorComponent), canActivate: [authGuard, roleGuard], data: { roles: ['ENGINEER'] } },
  { path: 'budget', loadComponent: () => import('./pages/budget/budget-screen.component').then((m) => m.BudgetScreenComponent), data: { title: 'Presupuestos' } },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat-screen.component').then((m) => m.ChatScreenComponent), data: { title: 'Chat' } },
  { path: 'rating', loadComponent: () => import('./pages/rating/rating-screen.component').then((m) => m.RatingScreenComponent), data: { title: 'Calificar Servicio' } },
  { path: 'service-request', loadComponent: () => import('./pages/service-request/service-request.component').then((m) => m.ServiceRequestComponent), data: { title: 'Solicitar Servicio' } },
  { path: 'servicios', loadComponent: () => import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent) },
  { path: 'pagos', loadComponent: () => import('./pages/pagos/pagos.component').then((m) => m.PagosComponent), data: { title: 'Historial de Pagos' } },
  { path: 'resumen', loadComponent: () => import('./pages/summary/summary.component').then((m) => m.SummaryComponent), canActivate: [authGuard] },

  { path: '**', redirectTo: 'home' },
];
