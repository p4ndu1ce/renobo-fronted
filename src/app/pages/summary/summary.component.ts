import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
    this.http.post<{ message: string; work: { id: string; descripcion: string; ubicacion: string; presupuestoInicial: number; estado: string; createdAt: string } }>(
      'https://s6txacomrf.execute-api.us-east-1.amazonaws.com/dev/works',
      payload
    ).subscribe({
      next: (res) => {
        alert('¡Solicitud enviada con éxito a AWS! Un asesor te contactará.');
        this.cartService.clearCart();
        // Mostrar la obra de inmediato en Servicios Recientes (evita esperar consistencia eventual del GSI)
        if (res?.work) {
          const work: Work = {
            id: res.work.id,
            descripcion: res.work.descripcion,
            ubicacion: res.work.ubicacion,
            presupuestoInicial: res.work.presupuestoInicial,
            estado: res.work.estado as Work['estado'],
            createdAt: res.work.createdAt,
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
