import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas con parámetro dinámico :workId → render en servidor (no prerender).
  { path: 'engineer/visit/:workId', renderMode: RenderMode.Server },
  { path: 'partner/service/:workId', renderMode: RenderMode.Server },
  // Resto: prerender cuando sea posible.
  { path: '**', renderMode: RenderMode.Prerender },
];
