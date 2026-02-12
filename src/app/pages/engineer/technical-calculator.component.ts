/**
 * Calculadora técnica: flujo del ingeniero.
 *
 * Lista lo que el Cliente necesita para su Servicio usando Partidas de Obra (catálogo del backend).
 * 1. El ingeniero elige partidas y cantidades (ej. "Pintura interior m²" x 50).
 * 2. Presiona "Disponibilizar servicio para Partners": la obra pasa a WAITING_PARTNERS y los Partners (Maestros de Obra) pueden verla asignada.
 * 3. Backend expande partidas a materiales y pone la obra en WAITING_PARTNERS.
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WorkService, type PartnerResponseStatus, type PartidaObra } from '../../services/work.service';
import { PartnerService } from '../../services/partner.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { WorkContextSummaryComponent } from './work-context-summary/work-context-summary.component';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';

/** Línea del pedido por partida (lo que el cliente necesita). */
export interface PartidaLine {
  partidaId: string;
  partidaName: string;
  unit: string;
  quantity: number;
}

@Component({
  selector: 'app-technical-calculator',
  standalone: true,
  imports: [CommonModule, WorkContextSummaryComponent, LoadingButtonComponent],
  templateUrl: './technical-calculator.component.html',
  styleUrl: './technical-calculator.component.css'
})
export class TechnicalCalculatorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public workService = inject(WorkService);
  public partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  workId = signal<string | null>(null);
  searchTerm = signal('');
  isCartOpen = signal(false);
  /** true mientras la petición "Disponibilizar servicio para Partners" está en curso. */
  isSubmitting = signal(false);
  sendError = signal<string | null>(null);
  isStartingWork = signal(false);
  /** true mientras se ejecuta "Simular OK de Partners" (DebugPanel). */
  isSimulatingPartnerOk = signal(false);
  /** Solo ingenieros ven el DebugPanel. */
  isEngineer = computed(() => this.authService.userRole() === 'ENGINEER');

  /** Catálogo de partidas de obra (GET /partidas, seed del backend). */
  partidasList = signal<PartidaObra[]>([]);
  partidasLoading = signal(true);

  /** Partidas filtradas por búsqueda (nombre o categoría). */
  filteredPartidas = computed(() => {
    const list = this.partidasList();
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;
    return list.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        (p.category ?? '').toLowerCase().includes(term)
    );
  });

  /** Pedido del cliente: partidas con cantidad (lo que necesita para el servicio). */
  partidaLines = signal<PartidaLine[]>([]);

  /** Resumen de partidas en el pedido (para listado y panel lateral). */
  summaryPartidas = computed(() => this.partidaLines());

  /** Número de partidas distintas en el pedido. */
  partidaCartCount = computed(() => this.partidaLines().length);

  /** Total de unidades (suma de cantidades de todas las partidas). */
  totalPartidaUnits = computed(() =>
    this.partidaLines().reduce((acc, l) => acc + l.quantity, 0)
  );

  /** Partidas cuya lista de materiales está visible (toggle "Ver materiales"). */
  partidaMaterialsExpanded = signal<Set<string>>(new Set());

  togglePartidaMaterials(partidaId: string): void {
    this.partidaMaterialsExpanded.update((set) => {
      const next = new Set(set);
      if (next.has(partidaId)) next.delete(partidaId);
      else next.add(partidaId);
      return next;
    });
  }

  isPartidaMaterialsExpanded(partidaId: string): boolean {
    return this.partidaMaterialsExpanded().has(partidaId);
  }

  /** Obra actual (para límite del plan aprobado). */
  currentWork = computed(() => {
    const id = this.workId();
    if (!id) return null;
    return this.workService.works().find(w => w.id === id) ?? null;
  });

  /** Cuando la obra está WAITING_PARTNERS: partners involucrados (desde work.items). */
  partnersInvolvedInWork = computed(() => {
    const work = this.currentWork();
    const items = work?.items ?? [];
    const partnerIds = [...new Set(items.map(i => i.partnerId).filter(Boolean))];
    return partnerIds.map(pid => {
      const partner = this.partnerService.getPartnerById(pid);
      const status: PartnerResponseStatus = work?.partnerResponses?.[pid] ?? 'PENDING';
      return { partnerId: pid, name: partner?.name ?? pid, status };
    });
  });

  /** true cuando todos los partners involucrados están CONFIRMED, o no hay partners (ej. pedido por partidas). */
  allPartnersConfirmed = computed(() => {
    const list = this.partnersInvolvedInWork();
    if (list.length === 0) return true;
    return list.every(p => p.status === 'CONFIRMED');
  });

  /** Límite del plan aprobado (Bronce/Plata/Oro). */
  planLimit = computed(() => {
    const work = this.currentWork();
    if (work?.planAmount != null) return work.planAmount;
    const byPlan: Record<string, number> = { BRONZE: 1_000, SILVER: 5_000, GOLD: 15_000 };
    return byPlan[work?.planId ?? 'BRONZE'] ?? 1_000;
  });

  ngOnInit(): void {
    this.partnerService.loadPartners();
    const id = this.route.snapshot.paramMap.get('workId');
    this.workId.set(id);
    this.workService.getPartidas().subscribe({
      next: (list) => {
        this.partidasList.set(list);
        this.partidasLoading.set(false);
      },
      error: () => this.partidasLoading.set(false),
    });
  }

  /** Añade o suma cantidad de una partida al pedido (lo que el cliente necesita). */
  addPartida(partida: PartidaObra, quantity: number): void {
    const qty = Math.max(1, Math.floor(quantity));
    const current = this.partidaLines();
    const idx = current.findIndex(l => l.partidaId === partida.id);
    let next: PartidaLine[];
    if (idx >= 0) {
      next = current.slice();
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
    } else {
      next = [
        ...current,
        { partidaId: partida.id, partidaName: partida.name, unit: partida.unit, quantity: qty }
      ];
    }
    this.partidaLines.set(next);
  }

  /** Actualiza la cantidad de una partida en el pedido. */
  updatePartidaQuantity(partidaId: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const current = this.partidaLines();
    const idx = current.findIndex(l => l.partidaId === partidaId);
    if (idx < 0) return;
    if (val <= 0) {
      this.partidaLines.set(current.filter(l => l.partidaId !== partidaId));
      return;
    }
    const next = current.slice();
    next[idx] = { ...next[idx], quantity: val };
    this.partidaLines.set(next);
  }

  /** Quita una partida del pedido. */
  removePartidaLine(partidaId: string): void {
    this.partidaLines.set(this.partidaLines().filter(l => l.partidaId !== partidaId));
  }

  /** Cantidad actual de una partida en el pedido. */
  getPartidaQuantityForId(partidaId: string): number {
    return this.partidaLines().find(l => l.partidaId === partidaId)?.quantity ?? 0;
  }

  /**
   * Envía las partidas al backend. El backend las expande a materiales y pone la obra en WAITING_PARTNERS.
   */
  sendToSuppliers(): void {
    this.sendError.set(null);
    const id = this.workId();
    if (!id) {
      this.sendError.set('No hay obra seleccionada.');
      return;
    }
    const lines = this.partidaLines();
    if (lines.length === 0) {
      this.sendError.set('Agrega al menos una partida de obra.');
      return;
    }
    const work = this.currentWork();
    if (!work) {
      this.sendError.set('Obra no encontrada.');
      return;
    }

    this.isSubmitting.set(true);
    const partidas = lines.map(l => ({ partidaId: l.partidaId, quantity: l.quantity }));
    this.workService.confirmTechnicalVisitWithPartidas(id, partidas).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show('Servicio disponibilizado para Partners. La obra está en espera de confirmación de los Maestros de Obra.', 'success');
        this.router.navigate(['/engineer']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.sendError.set(err?.message ?? 'Error al enviar la solicitud.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/engineer']);
  }

  /**
   * Simula que todos los partners confirmaron (solo ENGINEER, obra en WAITING_PARTNERS).
   * Backend pone items[].confirmed = true y status → IN_PROGRESS. Para probar flujo sin portal de partners.
   */
  simulatePartnerOk(): void {
    const id = this.workId();
    if (!id || this.currentWork()?.status !== 'WAITING_PARTNERS') return;
    this.sendError.set(null);
    this.isSimulatingPartnerOk.set(true);
    this.workService.simulatePartnerOk(id).subscribe({
      next: () => {
        this.isSimulatingPartnerOk.set(false);
        this.toastService.show('Partners simulados: todos los ítems confirmados. La obra pasó a En curso.', 'success');
      },
      error: (err) => {
        this.isSimulatingPartnerOk.set(false);
        this.sendError.set(err?.message ?? 'Error al simular OK de partners.');
      }
    });
  }

  /** Marca la respuesta del partner (checklist de disponibilidad). */
  setPartnerResponse(partnerId: string, status: PartnerResponseStatus): void {
    const id = this.workId();
    const work = this.currentWork();
    if (!id || !work) return;
    const next = { ...(work.partnerResponses ?? {}), [partnerId]: status };
    this.workService.updatePartnerResponse(id, next).subscribe({
      error: (err) => this.sendError.set(err?.message ?? 'Error al actualizar.')
    });
  }

  /** Pasa la obra a IN_PROGRESS (solo si todos los partners CONFIRMED). */
  startWork(): void {
    const id = this.workId();
    if (!id || !this.allPartnersConfirmed()) return;
    this.sendError.set(null);
    this.isStartingWork.set(true);
    this.workService.startWork(id).subscribe({
      next: () => {
        this.isStartingWork.set(false);
        this.router.navigate(['/engineer'], { queryParams: { success: 'obra-iniciada' } });
      },
      error: (err) => {
        this.isStartingWork.set(false);
        this.sendError.set(err?.message ?? 'Error al iniciar obra.');
      }
    });
  }
}
