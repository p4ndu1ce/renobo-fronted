import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-card.component.html',
  styleUrl: './skeleton-card.component.css',
})
export class SkeletonCardComponent {
  /** Número de tarjetas esqueleto a mostrar. */
  count = input(1);

  /** Array [0..count-1] para el @for. */
  items = computed(() => Array.from({ length: Math.max(0, this.count()) }, (_, i) => i));
}
