import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Ruta con parámetro dinámico :workId → render en servidor (no prerender).
  { path: 'engineer/visit/:workId', renderMode: RenderMode.Server },
  // Resto: prerender cuando sea posible.
  { path: '**', renderMode: RenderMode.Prerender },
];
