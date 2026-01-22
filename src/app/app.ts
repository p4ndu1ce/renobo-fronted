import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ConfigService, type Service } from './services/config.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CurrencyPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App {
  protected readonly title = signal('renobo-frontend');
  protected readonly configService = inject(ConfigService);
  protected readonly searchTerm = signal('');

  protected readonly filteredServices = computed(() => {
    const catalog = this.configService.catalog();
    const term = this.searchTerm().toLowerCase().trim();

    if (!catalog || term === '') {
      return catalog?.services ?? [];
    }

    return catalog.services.filter((service: Service) => {
      const nameMatch = service.name.toLowerCase().includes(term);
      const categoryMatch = service.category.toLowerCase().includes(term);
      return nameMatch || categoryMatch;
    });
  });
}
