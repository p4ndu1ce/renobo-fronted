import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';

export interface ServicioReciente {
  titulo: string;
  fecha: string;
  estatus: 'En Revisión' | 'Aprobado' | 'Rechazado' | 'Completado';
}

export interface Categoria {
  nombre: string;
  icono: string;
  bg: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private router = inject(Router);
  public configService = inject(ConfigService);

  categorias: Categoria[] = [
    { nombre: 'Electricidad', icono: '💡', bg: 'bg-amber-50' },
    { nombre: 'Plomería', icono: '🔧', bg: 'bg-sky-50' },
    { nombre: 'Carpintería', icono: '🪚', bg: 'bg-amber-50' },
    { nombre: 'Pintura', icono: '🎨', bg: 'bg-purple-50' },
    { nombre: 'A/C', icono: '❄️', bg: 'bg-cyan-50' },
    { nombre: 'General', icono: '📦', bg: 'bg-slate-50' },
  ];

  /** Servicios recientes: por ahora datos de ejemplo; conectar a API de "mis obras" cuando exista. */
  serviciosRecientes: ServicioReciente[] = [
    { titulo: 'Reparación eléctrica', fecha: '2025-01-20T10:00:00Z', estatus: 'En Revisión' },
    { titulo: 'Instalación A/C', fecha: '2025-01-15T14:30:00Z', estatus: 'Aprobado' },
  ];

  goToCalculator() {
    this.router.navigate(['/calculadora']);
  }
}
