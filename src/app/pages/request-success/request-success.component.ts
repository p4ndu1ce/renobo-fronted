import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

/** Partícula de confeti: posición y timing para animación única al cargar. */
export interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const ORANGE_COLORS = ['#fa5404', '#f97316', '#fb923c', '#fdba74'];

@Component({
  selector: 'app-request-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './request-success.component.html',
  styleUrl: './request-success.component.css',
})
export class RequestSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  /** Código de solicitud enviado desde el backend (state al navegar desde service-request). */
  requestCode = signal<string>('');

  /** Nombre del plan (desde query param planName). */
  planName = signal<string>('');

  /** Partículas de confeti naranja (generadas una vez en init). */
  confettiPieces = signal<ConfettiPiece[]>([]);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const state = history.state as { requestCode?: string } | undefined;
      this.requestCode.set(state?.requestCode?.trim() ?? '');
    }
    const plan = this.route.snapshot.queryParamMap.get('plan') ?? this.route.snapshot.queryParamMap.get('planName');
    this.planName.set(plan ?? 'seleccionado');
    this.spawnConfetti();
  }

  /** Genera un conjunto sutil de partículas que caen una sola vez. */
  private spawnConfetti(): void {
    const pieces: ConfettiPiece[] = [];
    const positions = [8, 15, 22, 30, 38, 45, 52, 60, 68, 75, 82, 90];
    for (let i = 0; i < 18; i++) {
      pieces.push({
        left: positions[i % positions.length] + (i % 3) * 2,
        delay: (i * 0.08) + Math.floor(i / 4) * 0.2,
        duration: 2.2 + (i % 5) * 0.2,
        color: ORANGE_COLORS[i % ORANGE_COLORS.length],
        size: 4 + (i % 3),
      });
    }
    this.confettiPieces.set(pieces);
  }
}
