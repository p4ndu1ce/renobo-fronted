import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Contexto mínimo de obra para el resumen sticky (título y descripción). */
export interface WorkContextSummaryWork {
  title?: string | null;
  description?: string | null;
}

/**
 * Sticky header con el proyecto actual. Ultra limpio para uso en obra (sol, campo).
 * El ingeniero nunca pierde el hilo de qué proyecto está relevando.
 */
@Component({
  selector: 'app-work-context-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (work()) {
      <div class="bg-slate-800 text-white p-4 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <h3 class="text-orange-400 font-bold text-sm uppercase tracking-wider">Proyecto actual</h3>
        <p class="text-lg font-bold mt-0.5">{{ work()!.title || 'Sin título' }}</p>
        <p class="text-xs text-slate-300 italic line-clamp-1 mt-1">{{ work()!.description || '—' }}</p>
      </div>
    }
  `,
  styles: [],
})
export class WorkContextSummaryComponent {
  /** Obra actual (título y descripción). No se renderiza nada si es null. */
  work = input<WorkContextSummaryWork | null>(null);
}
