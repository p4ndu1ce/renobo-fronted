/**
 * Calculadora técnica: flujo del ingeniero.
 *
 * 1. Selección: El ingeniero elige el material (ej. "Cemento Gris").
 * 2. Asignación: Elige el proveedor en el dropdown "Suministrado por" (ej. "Ferretería El Martillo", por cercanía a la obra).
 * 3. Control: La barra superior muestra el total de materiales vs el límite del Plan (Bronce/Plata/Oro).
 * 4. Cierre: Presiona "Solicitar Disponibilidad a Partners".
 * 5. Backend: Se envía un correo automático a cada ferretería con su lista correspondiente (items agrupados por partnerId).
 */
import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ConfigService, type Service } from '../../services/config.service';
import { WorkService, type WorkItem, type PartnerResponseStatus } from '../../services/work.service';
import { PartnerService } from '../../services/partner.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { WorkContextSummaryComponent } from './work-context-summary/work-context-summary.component';
import { LoadingButtonComponent } from '../../shared/components/loading-button/loading-button.component';

export interface OrderLine {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  partnerId: string;
  partnerName: string;
}

/** Item con precio para agrupación por partner (selectedItems). */
export interface SelectedItemWithPrice extends OrderLine {
  price: number;
}

export interface SummaryByPartner {
  partnerId: string;
  name: string;
  total: number;
  count: number;
  items: { id: string; name: string; quantity: number; unit: string; price: number }[];
}

@Component({
  selector: 'app-technical-calculator',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, WorkContextSummaryComponent, LoadingButtonComponent],
  templateUrl: './technical-calculator.component.html',
  styleUrl: './technical-calculator.component.css'
})
export class TechnicalCalculatorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public configService = inject(ConfigService);
  public workService = inject(WorkService);
  public partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  workId = signal<string | null>(null);
  searchTerm = signal('');
  isCartOpen = signal(false);
  /** true mientras la petición "Solicitar Disponibilidad" está en curso. */
  isSubmitting = signal(false);
  sendError = signal<string | null>(null);
  isStartingWork = signal(false);
  /** true mientras se ejecuta "Simular OK de Partners" (DebugPanel). */
  isSimulatingPartnerOk = signal(false);
  /** Solo ingenieros ven el DebugPanel. */
  isEngineer = computed(() => this.authService.userRole() === 'ENGINEER');

  /** Partner seleccionado por material (para el dropdown "Suministrado por"). */
  selectedPartnerForMaterial = signal<Record<string, { partnerId: string; partnerName: string }>>({});

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

  /** true cuando todos los partners involucrados están CONFIRMED (habilita INICIAR OBRA). */
  allPartnersConfirmed = computed(() => {
    const list = this.partnersInvolvedInWork();
    if (list.length === 0) return false;
    return list.every(p => p.status === 'CONFIRMED');
  });

  /** Límite del plan aprobado (Bronce/Plata/Oro). */
  planLimit = computed(() => {
    const work = this.currentWork();
    if (work?.planAmount != null) return work.planAmount;
    const byPlan: Record<string, number> = { BRONZE: 1_000, SILVER: 5_000, GOLD: 15_000 };
    return byPlan[work?.planId ?? 'BRONZE'] ?? 1_000;
  });

  /** Materiales con lista de partners para el dropdown "Suministrado por". */
  materialsWithPartner = computed(() => {
    const services = this.configService.catalog()?.services ?? [];
    const selected = this.selectedPartnerForMaterial();
    return services.map(s => {
      const partners = this.partnerService.getPartnersByMaterialSync(s.id);
      const sel = selected[s.id];
      const partner = sel?.partnerId
        ? (partners.find(p => p.id === sel.partnerId) ?? partners[0])
        : partners[0];
      const partnerId = (sel && sel.partnerId === '') ? '' : (partner?.id ?? '');
      const partnerName = partnerId ? (partner?.name ?? '—') : 'Por asignar';
      return { ...s, partnerId, partnerName, partners };
    });
  });

  filteredMaterials = computed(() => {
    const list = this.materialsWithPartner();
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;
    return list.filter(
      m =>
        m.name.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term) ||
        (m.partnerName ?? '').toLowerCase().includes(term)
    );
  });

  /** Líneas del pedido (material + cantidad + partner). */
  orderLines = signal<OrderLine[]>([]);

  /** Items seleccionados con precio (para summaryByPartner y totales). */
  selectedItems = computed((): SelectedItemWithPrice[] => {
    const lines = this.orderLines();
    const services = this.configService.catalog()?.services ?? [];
    return lines.map(l => {
      const price = services.find(s => s.id === l.id)?.price?.value ?? 0;
      return { ...l, price };
    });
  });

  /** Agrupamos los items seleccionados por partnerId (desde el pedido, no depende de partners cargados). */
  summaryByPartner = computed(() => {
    const items = this.selectedItems();
    const partnerIds = [...new Set(items.map(i => i.partnerId ?? ''))];
    return partnerIds.map(pid => {
      const partner = pid ? this.partnerService.getPartnerById(pid) : undefined;
      const name = partner?.name ?? (pid || 'Proveedor por asignar');
      const groupItems = items.filter(i => (i.partnerId ?? '') === pid);
      const total = groupItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
      return {
        partnerId: pid || '_sin_asignar',
        name,
        total,
        count: groupItems.length,
        items: groupItems.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, price: i.price }))
      };
    });
  });

  /** Total en $ de materiales del pedido (para barra de crédito). */
  totalMaterialsCost = computed(() =>
    this.selectedItems().reduce((sum, i) => sum + i.price * i.quantity, 0)
  );

  /** Porcentaje Total Materiales vs Límite del Plan (para barra; >100 = excedido). */
  creditProgressPercent = computed(() => {
    const total = this.totalMaterialsCost();
    const limit = this.planLimit();
    if (limit <= 0) return 0;
    return Math.min(100, (total / limit) * 100);
  });

  /** True si el total de materiales supera el límite del plan. */
  isOverPlanLimit = computed(() => this.totalMaterialsCost() > this.planLimit());

  /** Número total de unidades en el pedido (para footer "X ítems"). */
  totalItemsCount = computed(() =>
    this.orderLines().reduce((acc, l) => acc + l.quantity, 0)
  );

  /** Cantidad de líneas en el carrito (badge). Misma fuente que summaryByPartner. */
  cartItemCount = computed(() => this.orderLines().length);

  /** Cuando cargan los partners, asigna el primer partner por defecto a líneas que tenían partnerId vacío. */
  private syncLinesWithDefaultPartners = effect(() => {
    const partners = this.partnerService.partners();
    const lines = this.orderLines();
    if (partners.length === 0 || lines.length === 0) return;
    const needsSync = lines.some(l => !l.partnerId?.trim());
    if (!needsSync) return;
    const services = this.configService.catalog()?.services ?? [];
    const next = lines.map(l => {
      if (l.partnerId?.trim()) return l;
      const partnersForMaterial = this.partnerService.getPartnersByMaterialSync(l.id);
      const partner = partnersForMaterial[0];
      if (!partner) return l;
      return { ...l, partnerId: partner.id, partnerName: partner.name };
    });
    this.orderLines.set(next);
  });

  ngOnInit(): void {
    this.configService.loadConfig();
    this.partnerService.loadPartners();
    const id = this.route.snapshot.paramMap.get('workId');
    this.workId.set(id);
  }

  setPartnerForMaterial(materialId: string, partnerId: string): void {
    const partner = this.partnerService.getPartnerById(partnerId);
    this.selectedPartnerForMaterial.update(prev => ({
      ...prev,
      [materialId]: { partnerId, partnerName: partner?.name ?? '' }
    }));
    // Actualizar la línea del pedido si ese material ya está en el carrito
    const lines = this.orderLines();
    const idx = lines.findIndex(l => l.id === materialId);
    if (idx >= 0) {
      const next = lines.slice();
      next[idx] = { ...next[idx], partnerId, partnerName: partner?.name ?? '' };
      this.orderLines.set(next);
    }
  }

  addMaterial(
    material: Service & { partnerId: string; partnerName: string; partners?: { id: string; name: string }[] },
    quantity: number
  ): void {
    const qty = Math.max(1, Math.floor(quantity));
    const current = this.orderLines();
    const idx = current.findIndex(l => l.id === material.id);
    let next: OrderLine[];
    if (idx >= 0) {
      next = current.slice();
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
    } else {
      next = [
        ...current,
        {
          id: material.id,
          name: material.name,
          unit: material.unit,
          quantity: qty,
          partnerId: material.partnerId,
          partnerName: material.partnerName
        }
      ];
    }
    this.orderLines.set(next);
  }

  updateQuantity(id: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const current = this.orderLines();
    const idx = current.findIndex(l => l.id === id);
    if (idx < 0) return;
    if (val <= 0) {
      this.orderLines.set(current.filter(l => l.id !== id));
      return;
    }
    const next = current.slice();
    next[idx] = { ...next[idx], quantity: val };
    this.orderLines.set(next);
  }

  removeLine(id: string): void {
    this.orderLines.set(this.orderLines().filter(l => l.id !== id));
  }

  getQuantityForId(id: string): number {
    return this.orderLines().find(l => l.id === id)?.quantity ?? 0;
  }

  /**
   * Cierre del flujo: envía la solicitud al backend.
   * Genera y muestra el mensaje de correo por partner (validación) y luego llama al backend.
   */
  sendToSuppliers(): void {
    this.sendError.set(null);
    const id = this.workId();
    if (!id) {
      this.sendError.set('No hay obra seleccionada.');
      return;
    }
    const lines = this.orderLines();
    if (lines.length === 0) {
      this.sendError.set('Agrega al menos un material.');
      return;
    }
    const missingPartner = lines.find(l => !l.partnerId?.trim());
    if (missingPartner) {
      this.sendError.set('Cada material debe tener un proveedor en «Suministrado por». Si el desplegable está vacío, recarga la página.');
      return;
    }
    const work = this.currentWork();
    if (!work) {
      this.sendError.set('Obra no encontrada.');
      return;
    }

    const engineerName = this.authService.currentUser()?.name
      ?? this.authService.currentUser()?.email?.split('@')[0]
      ?? 'Ingeniero Renobo';
    const summary = this.summaryByPartner();

    this.isSubmitting.set(true);
    this.sendError.set(null);
    const services = this.configService.catalog()?.services ?? [];
    const items: WorkItem[] = lines.map(l => {
      const service = services.find(s => s.id === l.id);
      const price = service?.price?.value ?? 0;
      return { materialId: l.id, quantity: l.quantity, partnerId: l.partnerId, price };
    });
    this.workService.confirmTechnicalVisit(id, items).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.show('Solicitud de disponibilidad enviada a los proveedores correctamente.', 'success');
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
