import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { CurrencyPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-calculadora',
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './calculadora.component.html',
  styleUrl: './calculadora.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CalculadoraComponent {
  public configService = inject(ConfigService);
  public authService = inject(AuthService);
  public cartService = inject(CartService);
  private router = inject(Router);

  // 1. Buscador
  searchTerm = signal('');

  // 1. Estado del panel lateral
  isCartOpen = signal(false);

  // 2. Lógica del Buscador Inteligente
  filteredServices = computed(() => {
    const allServices = this.configService.catalog()?.services || [];
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return allServices;

    return allServices.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.category.toLowerCase().includes(term)
    );
  });

  updateQuantity(id: string, event: Event) {
    const val = Number((event.target as HTMLInputElement).value);
    this.cartService.updateQuantity(id, val);
  }

  handleRequestCredit() {
    console.log('handleRequestCredit llamado');
    console.log('isLoggedIn:', this.authService.isLoggedIn());
    
    if (this.authService.isLoggedIn()) {
      // Si está logueado, lo enviamos al resumen final
      console.log('Enviando presupuesto:', this.cartService.basket());
      this.router.navigate(['/resumen']);
    } else {
      // Si no, lo mandamos a que se registre o inicie sesión
      // Podemos pasarle el presupuesto por estado para no perderlo
      console.log('Redirigiendo a login');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: '/calculadora' } 
      });
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
