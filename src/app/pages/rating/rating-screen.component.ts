import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Star, Send } from 'lucide-angular';
import { WorkService } from '../../services/work.service';

@Component({
  selector: 'app-rating-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './rating-screen.component.html',
  styleUrl: './rating-screen.component.css',
})
export class RatingScreenComponent {
  private router = inject(Router);
  private workService = inject(WorkService);

  readonly icons = { ArrowLeft, Star, Send };

  rating = signal(0);
  hoveredRating = signal(0);
  comment = signal('');
  isSubmitting = signal(false);
  errorMessage = signal('');

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
    const state = history.state as { workId?: string };
    const id = state?.workId;
    if (!id) {
      this.errorMessage.set('No se pudo identificar el servicio. Vuelve atrás e intenta de nuevo.');
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.workService.submitRating(id, this.rating(), this.comment()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error ?? err.message ?? 'Error al enviar la valoración.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
