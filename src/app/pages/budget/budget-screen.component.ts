import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/**
 * En el flujo actual el cliente no elige técnico en esta pantalla:
 * el supervisor aprueba/rechaza y asigna ingeniero desde el panel.
 * Esta ruta redirige a seguimiento.
 */
@Component({
  selector: 'app-budget-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './budget-screen.component.html',
  styleUrl: './budget-screen.component.css',
})
export class BudgetScreenComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    const state = history.state as { workId?: string } | undefined;
    const id = state?.workId?.trim();
    if (id) {
      this.router.navigate(['/tracking'], { queryParams: { workId: id } });
    } else {
      this.router.navigate(['/tracking']);
    }
  }
}
