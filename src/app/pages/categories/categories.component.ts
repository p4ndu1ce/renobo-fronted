import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, ChevronRight } from 'lucide-angular';

export interface ServiceCategoryItem {
  id: string;
  name: string;
  /** Nombre del icono Lucide (ej: 'Zap', 'Droplet'). */
  icon: string;
  color: string;
  bgColor: string;
  services: string[];
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent {
  private router = inject(Router);

  readonly icons = { ArrowLeft, ChevronRight };
  readonly categories: ServiceCategoryItem[] = [
    {
      id: 'electricidad',
      name: 'Electricidad',
      icon: 'Zap',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      services: [
        'Instalación de interruptores',
        'Reparación de cableado',
        'Instalación de lámparas',
        'Revisión de tablero eléctrico',
        'Instalación de tomacorrientes',
      ],
    },
    {
      id: 'plomeria',
      name: 'Plomería',
      icon: 'Droplet',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      services: [
        'Reparación de fugas',
        'Instalación de lavamanos',
        'Destape de tuberías',
        'Instalación de sanitarios',
        'Reparación de grifos',
      ],
    },
    {
      id: 'carpinteria',
      name: 'Carpintería',
      icon: 'Hammer',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      services: [
        'Instalación de puertas',
        'Reparación de muebles',
        'Construcción de closets',
        'Instalación de ventanas',
        'Muebles a medida',
      ],
    },
    {
      id: 'pintura',
      name: 'Pintura',
      icon: 'PaintBucket',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      services: [
        'Pintura de interiores',
        'Pintura de exteriores',
        'Pintura de techos',
        'Pintura decorativa',
        'Aplicación de texturizados',
      ],
    },
    {
      id: 'aire',
      name: 'Aire Acondicionado',
      icon: 'Wind',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50',
      services: [
        'Instalación de A/C',
        'Mantenimiento preventivo',
        'Reparación de equipos',
        'Recarga de gas',
        'Limpieza de filtros',
      ],
    },
    {
      id: 'general',
      name: 'Servicios Generales',
      icon: 'Settings',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      services: [
        'Mantenimiento general',
        'Reparaciones varias',
        'Instalaciones diversas',
        'Servicios de emergencia',
        'Consultoría técnica',
      ],
    },
  ];

  /** Al elegir un servicio concreto: ir a Solicitar Servicio (descripción + adjuntos) y luego a presupuestos. */
  goToRequest(category: ServiceCategoryItem, service: string): void {
    this.router.navigate(['/service-request'], {
      state: { category: category.name, service },
    });
  }
}
