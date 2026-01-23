import { Component, inject, signal, computed, ViewEncapsulation, effect, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { ConfigService, type CreditPlan } from '../services/config.service';
import { AuthService } from '../services/auth.service';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

type CreditPlanWithExceeded = CreditPlan & { exceeded?: boolean };

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
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // 1. Buscador
  searchTerm = signal('');

  // 2. Cesta de Obra (ID del material -> cantidad)
  basket = signal<Map<string, number>>(this.loadBasket());

  constructor() {
    // Sincronizamos la cesta con localStorage cuando cambia (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const currentBasket = this.basket();
        const basketArray = Array.from(currentBasket.entries());
        localStorage.setItem('calculadoraBasket', JSON.stringify(basketArray));
      });
    }
  }

  private loadBasket(): Map<string, number> {
    // Cargamos la cesta desde localStorage al iniciar (solo en el navegador)
    if (isPlatformBrowser(this.platformId)) {
      try {
        const saved = localStorage.getItem('calculadoraBasket');
        if (saved) {
          const basketArray = JSON.parse(saved) as [string, number][];
          return new Map(basketArray);
        }
      } catch (error) {
        console.error('Error al cargar la cesta:', error);
      }
    }
    return new Map();
  }

  // 3. Lógica del Buscador Inteligente
  filteredServices = computed(() => {
    const allServices = this.configService.catalog()?.services || [];
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return allServices;

    return allServices.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.category.toLowerCase().includes(term)
    );
  });

  // 4. Cálculo del Presupuesto Total
  totalBudget = computed(() => {
    const allServices = this.configService.catalog()?.services || [];
    const currentBasket = this.basket();
    
    let total = 0;
    currentBasket.forEach((qty, id) => {
      const service = allServices.find(s => s.id === id);
      if (service) total += service.price.value * qty;
    });
    return total;
  });

  // Alias para grandTotal (compatibilidad con la lógica de planes)
  grandTotal = computed(() => this.totalBudget());

  // 1. Buscamos el plan recomendado basado en el total
  recommendedPlan = computed<CreditPlanWithExceeded | null>(() => {
    const total = this.grandTotal();
    // Obtenemos los planes y los ordenamos de menor a mayor por su monto máximo
    const plans = [...(this.configService.catalog()?.creditPlans || [])]
      .sort((a, b) => a.maxAmount - b.maxAmount);

    if (total === 0) return null;

    // 1. Buscamos el primer plan que cubra el monto total
    const match = plans.find(plan => total <= plan.maxAmount);

    if (match) return match;

    // 2. Si no hay match pero hay total, significa que EXCEDIO el plan máximo
    // Retornamos el último plan pero con una bandera de "monto excedido"
    if (total > 0 && plans.length > 0) {
      return { ...plans[plans.length - 1], exceeded: true };
    }

    return null;
  });

  // 2. Calculamos una cuota estimada (ejemplo a 12 meses, puedes ajustarlo)
  estimatedQuota = computed(() => {
    const total = this.grandTotal();
    return total > 0 ? total / 12 : 0;
  });

  // 1. Calculamos qué tan lleno está el plan actual (0 a 100)
  progressPercentage = computed(() => {
    const total = this.grandTotal();
    const plan = this.recommendedPlan();
    if (!plan || total === 0) return 0;
    
    // Si excedió el plan, la barra debe estar al 100%
    if (plan.exceeded) return 100;

    const percentage = (total / plan.maxAmount) * 100;
    return Math.min(percentage, 100); 
  });

  // 2. Definimos el color según el porcentaje (Verde -> Ámbar -> Rojo)
  progressBarColor = computed(() => {
    const p = this.progressPercentage();
    const isExceeded = this.recommendedPlan()?.exceeded;

    if (isExceeded || p > 90) return 'bg-rose-500'; // Rojo: Límite o excedido
    if (p > 65) return 'bg-amber-500';             // Ámbar: Cerca del límite
    return 'bg-emerald-500';                       // Verde: Seguro
  });

  updateQuantity(id: string, event: Event) {
    const val = Number((event.target as HTMLInputElement).value);
    const newBasket = new Map(this.basket());
    if (val > 0) {
      newBasket.set(id, val);
    } else {
      newBasket.delete(id);
    }
    this.basket.set(newBasket);
  }

  handleRequestCredit() {
    console.log('handleRequestCredit llamado');
    console.log('isLoggedIn:', this.authService.isLoggedIn());
    
    if (this.authService.isLoggedIn()) {
      // Si está logueado, lo enviamos al formulario de solicitud final
      console.log('Enviando presupuesto:', this.basket());
      this.router.navigate(['/solicitud-credito']);
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
