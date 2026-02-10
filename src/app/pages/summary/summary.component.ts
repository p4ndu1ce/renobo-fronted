import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { WorkService } from '../../services/work.service';
import type { Work } from '../../services/work.service';
import { CurrencyPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-summary',
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.css'
})
export class SummaryComponent {
  public cartService = inject(CartService);
  public authService = inject(AuthService);
  private workService = inject(WorkService);
  private router = inject(Router);
  private http = inject(HttpClient);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  confirmAndSend() {
    // El interceptor añade automáticamente el token en el header Authorization
    // Solo verificamos que el usuario esté autenticado
    if (!this.authService.isLoggedIn()) {
      alert('No estás autenticado. Por favor, inicia sesión.');
      this.router.navigate(['/login']);
      return;
    }

    const itemsDetail = this.cartService.selectedItemsDetail();
    
    // Construir descripción con los items seleccionados
    const descripcion = itemsDetail
      .map(item => `${item.quantity} ${item.unit} de ${item.name} (${item.category})`)
      .join('; ') || 'Obra sin partidas especificadas';
    
    const payload = {
      descripcion: descripcion,
      ubicacion: 'Por definir', // TODO: Agregar campo de ubicación en el formulario
      presupuestoInicial: this.cartService.grandTotal()
    };

    // El interceptor añadirá automáticamente el header Authorization
    const api = this.http.post<{ message: string; work: Record<string, unknown> }>(
      `${environment.apiUrl}/works`,
      payload
    );
    api.subscribe({
      next: (res) => {
        alert('¡Solicitud enviada con éxito a AWS! Un asesor te contactará.');
        this.cartService.clearCart();
        if (res?.work) {
          const r = res.work;
          const user = this.authService.currentUser();
          const userId = user?.email ?? user?.id ?? '';
          const work: Work = {
            id: String(r['id'] ?? ''),
            userId: String(r['userId'] ?? userId),
            engineerId: (r['engineerId'] as string) ? (r['engineerId'] as string) : undefined,
            planId: (r['planId'] as Work['planId']) ?? 'BRONZE',
            description: (r['description'] ?? r['descripcion']) as string ?? descripcion,
            status: (r['status'] as Work['status']) ?? 'CREDIT_PENDING',
            createdAt: String(r['createdAt'] ?? new Date().toISOString()),
            items: Array.isArray(r['items']) ? (r['items'] as Work['items']) : [],
          };
          this.workService.prependToMyWorks(work);
        }
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Error completo:', err);
        const errorMsg = err.error?.error || err.message || 'Error desconocido';
        
        if (err.status === 401) {
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          alert('Error al enviar: ' + errorMsg);
        }
      }
    });
  }
}
