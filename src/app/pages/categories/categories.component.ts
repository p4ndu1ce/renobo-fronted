import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, ChevronRight } from 'lucide-angular';
import { ConfigService } from '../../services/config.service';

export interface ServiceCategoryItem {
  id: string;
  name: string;
  /** Nombre del icono Lucide (ej: 'Zap', 'Droplet'). */
  icon: string;
  color: string;
  bgColor: string;
  services: string[];
}

const CATEGORY_UI: Record<string, { icon: string; color: string; bgColor: string }> = {
  electricidad: { icon: 'Zap', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  plomeria: { icon: 'Droplet', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  carpinteria: { icon: 'Hammer', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  pintura: { icon: 'PaintBucket', color: 'text-purple-500', bgColor: 'bg-purple-50' },
  'a/c': { icon: 'Wind', color: 'text-cyan-500', bgColor: 'bg-cyan-50' },
  general: { icon: 'Settings', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  revestimiento: { icon: 'PaintBucket', color: 'text-purple-500', bgColor: 'bg-purple-50' },
  'i.e': { icon: 'Zap', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  'i.s': { icon: 'Droplet', color: 'text-blue-500', bgColor: 'bg-blue-50' },
  infraestructura: { icon: 'Hammer', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  superestructura: { icon: 'Settings', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  'a.s-a.b': { icon: 'Settings', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent {
  private router = inject(Router);
  private configService = inject(ConfigService);

  readonly icons = { ArrowLeft, ChevronRight };

  /** Categorías desde config (servicios agrupados por category); fallback si no hay catalog. */
  categories = computed<ServiceCategoryItem[]>(() => {
    const services = this.configService.catalog()?.services ?? [];
    const byCategory = new Map<string, string[]>();
    for (const s of services) {
      const cat = (s.category || 'General').trim();
      const list = byCategory.get(cat) ?? [];
      if (!list.includes(s.name)) list.push(s.name);
      byCategory.set(cat, list);
    }
    if (byCategory.size === 0) {
      return [
        { id: 'electricidad', name: 'Electricidad', icon: 'Zap', color: 'text-yellow-500', bgColor: 'bg-yellow-50', services: ['Instalación eléctrica', 'Reparaciones'] },
        { id: 'plomeria', name: 'Plomería', icon: 'Droplet', color: 'text-blue-500', bgColor: 'bg-blue-50', services: ['Reparación de fugas', 'Instalaciones'] },
        { id: 'general', name: 'General', icon: 'Settings', color: 'text-gray-500', bgColor: 'bg-gray-50', services: ['Mantenimiento general'] },
      ];
    }
    return Array.from(byCategory.entries()).map(([name, svcs]) => {
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-.]/g, '') || 'general';
      const ui = CATEGORY_UI[id] ?? CATEGORY_UI['general'] ?? { icon: 'Settings', color: 'text-gray-500', bgColor: 'bg-gray-50' };
      return { id, name, icon: ui.icon, color: ui.color, bgColor: ui.bgColor, services: svcs };
    });
  });

  /** Al elegir un servicio concreto: ir a Solicitar Servicio (descripción + adjuntos) y luego a presupuestos. */
  goToRequest(category: ServiceCategoryItem, service: string): void {
    this.router.navigate(['/service-request'], {
      state: { category: category.name, service },
    });
  }
}
