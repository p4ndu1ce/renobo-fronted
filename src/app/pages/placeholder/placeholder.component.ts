import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BottomNavbarComponent } from '../../components/bottom-navbar/bottom-navbar.component';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [BottomNavbarComponent],
  template: `
    <div class="min-h-screen bg-slate-50 pb-24 font-sans flex flex-col items-center justify-center px-4">
      <p class="text-6xl mb-4">🚧</p>
      <h1 class="text-xl font-bold text-slate-800">{{ title }}</h1>
      <p class="text-slate-500 text-sm mt-2">Próximamente</p>
    </div>
    <app-bottom-navbar />
  `,
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] ?? 'Página';
}
