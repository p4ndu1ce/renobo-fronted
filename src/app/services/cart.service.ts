import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService, type CreditPlan } from './config.service';

type CreditPlanWithExceeded = CreditPlan & { exceeded?: boolean };

@Injectable({ providedIn: 'root' })
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private configService = inject(ConfigService);

  // Cesta de Obra (ID del material -> cantidad)
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

  // Cálculo del Presupuesto Total
  grandTotal = computed(() => {
    const allServices = this.configService.catalog()?.services || [];
    const currentBasket = this.basket();
    
    let total = 0;
    currentBasket.forEach((qty, id) => {
      const service = allServices.find(s => s.id === id);
      if (service) total += service.price.value * qty;
    });
    return total;
  });

  // Detalle de items seleccionados (Une la info del catálogo con las cantidades de la cesta)
  selectedItemsDetail = computed(() => {
    const allServices = this.configService.catalog()?.services || [];
    const currentBasket = this.basket();
    
    return allServices
      .filter(service => currentBasket.has(service.id))
      .map(service => ({
        ...service,
        quantity: currentBasket.get(service.id) || 0,
        subtotal: service.price.value * (currentBasket.get(service.id) || 0)
      }));
  });

  // Buscamos el plan recomendado basado en el total
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

  // Calculamos una cuota estimada (ejemplo a 12 meses, puedes ajustarlo)
  estimatedQuota = computed(() => {
    const total = this.grandTotal();
    return total > 0 ? total / 12 : 0;
  });

  // Calculamos qué tan lleno está el plan actual (0 a 100)
  progressPercentage = computed(() => {
    const total = this.grandTotal();
    const plan = this.recommendedPlan();
    if (!plan || total === 0) return 0;
    
    // Si excedió el plan, la barra debe estar al 100%
    if (plan.exceeded) return 100;

    const percentage = (total / plan.maxAmount) * 100;
    return Math.min(percentage, 100); 
  });

  // Definimos el color según el porcentaje (Verde -> Ámbar -> Rojo)
  progressBarColor = computed(() => {
    const p = this.progressPercentage();
    const isExceeded = this.recommendedPlan()?.exceeded;

    if (isExceeded || p > 90) return 'bg-rose-500'; // Rojo: Límite o excedido
    if (p > 65) return 'bg-amber-500';             // Ámbar: Cerca del límite
    return 'bg-emerald-500';                       // Verde: Seguro
  });

  updateQuantity(id: string, quantity: number) {
    const newBasket = new Map(this.basket());
    if (quantity > 0) {
      newBasket.set(id, quantity);
    } else {
      newBasket.delete(id);
    }
    this.basket.set(newBasket);
  }

  removeItem(id: string) {
    const newBasket = new Map(this.basket());
    newBasket.delete(id);
    this.basket.set(newBasket);
  }

  clearCart() {
    this.basket.set(new Map());
  }
}
