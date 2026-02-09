import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Star, Send } from 'lucide-angular';

@Component({
  selector: 'app-rating-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './rating-screen.component.html',
  styleUrl: './rating-screen.component.css',
})
export class RatingScreenComponent {
  private router = inject(Router);

  readonly icons = { ArrowLeft, Star, Send };

  rating = signal(0);
  hoveredRating = signal(0);
  comment = signal('');

  ratingLabel = (r: number): string => {
    switch (r) {
      case 5: return '¡Excelente!';
      case 4: return 'Muy Bueno';
      case 3: return 'Bueno';
      case 2: return 'Regular';
      case 1: return 'Necesita Mejorar';
      default: return '';
    }
  };

  setRating(value: number): void {
    this.rating.set(value);
  }

  setHover(value: number): void {
    this.hoveredRating.set(value);
  }

  submit(): void {
    if (this.rating() === 0) return;
    this.router.navigate(['/home']);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
