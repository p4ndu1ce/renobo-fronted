import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.css',
})
export class ServiciosComponent {
  public configService = inject(ConfigService);
  searchTerm = signal('');

  filteredServices = computed(() => {
    const all = this.configService.catalog()?.services ?? [];
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term)
    );
  });
}
