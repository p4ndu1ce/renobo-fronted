import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <p class="text-6xl mb-4">🚧</p>
      <h1 class="text-xl font-bold text-slate-800">{{ title }}</h1>
      <p class="text-slate-500 text-sm mt-2">Próximamente</p>
    </div>
  `,
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] ?? 'Página';
}
