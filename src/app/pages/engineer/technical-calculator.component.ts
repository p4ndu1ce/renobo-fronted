/**
 * Calculadora técnica: flujo del ingeniero.
 *
 * 1. Selección: El ingeniero elige el material (ej. "Cemento Gris").
 * 2. Asignación: Elige el proveedor en el dropdown "Suministrado por" (ej. "Ferretería El Martillo", por cercanía a la obra).
 * 3. Control: La barra superior muestra el total de materiales vs el límite del Plan (Bronce/Plata/Oro).
 * 4. Cierre: Presiona "Solicitar Disponibilidad a Partners".
 * 5. Backend: Se envía un correo automático a cada ferretería con su lista correspondiente (items agrupados por partnerId).
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ConfigService, type Service } from '../../services/config.service';
import { WorkService, type WorkItem, type PartnerResponseStatus } from '../../services/work.service';
import { PartnerService } from '../../services/partner.service';
import { AuthService } from '../../services/auth.service';
import { WorkContextSummaryComponent } from './work-context-summary/work-context-summary.component';

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
  imports: [CommonModule, CurrencyPipe, WorkContextSummaryComponent],
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

  workId = signal<string | null>(null);
  searchTerm = signal('');
  isCartOpen = signal(false);
  isSending = signal(false);
  sendError = signal<string | null>(null);
  isStartingWork = signal(false);

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
      const partner = sel ? partners.find(p => p.id === sel.partnerId) ?? partners[0] : partners[0];
      const partnerId = partner?.id ?? '';
      const partnerName = partner?.name ?? '—';
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

  /** Agrupamos los items seleccionados por el ID del Partner (Angular computed, instantáneo). */
  summaryByPartner = computed(() => {
    const items = this.selectedItems();
    const partners = this.partnerService.partners();

    return partners.map(p => ({
      partnerId: p.id,
      name: p.name,
      total: items.filter(i => i.partnerId === p.id).reduce((acc, i) => acc + (i.price * i.quantity), 0),
      count: items.filter(i => i.partnerId === p.id).length,
      items: items.filter(i => i.partnerId === p.id).map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, price: i.price }))
    })).filter(p => p.count > 0);
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

  totalItemsCount = computed(() =>
    this.orderLines().reduce((acc, l) => acc + l.quantity, 0)
  );

  ngOnInit(): void {
    this.configService.loadConfig();
    const id = this.route.snapshot.paramMap.get('workId');
    this.workId.set(id);
  }

  setPartnerForMaterial(materialId: string, partnerId: string): void {
    const partner = this.partnerService.getPartnerById(partnerId);
    this.selectedPartnerForMaterial.update(prev => ({
      ...prev,
      [materialId]: { partnerId, partnerName: partner?.name ?? '' }
    }));
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
    const work = this.currentWork();
    if (!work) {
      this.sendError.set('Obra no encontrada.');
      return;
    }
    this.sendError.set(null);

    const engineerName = this.authService.currentUser()?.name
      ?? this.authService.currentUser()?.email?.split('@')[0]
      ?? 'Ingeniero Renobo';
    const summary = this.summaryByPartner();

    summary.forEach(group => {
      const partner = this.partnerService.getPartnerById(group.partnerId);
      if (!partner) return;
      const itemsWithLabels = group.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit
      }));
      const email = this.workService.generatePartnerEmail(
        { id: partner.id, name: partner.name, email: partner.email },
        work,
        { engineerName, itemsWithLabels }
      );
      console.log(`[Correo a ${partner.name}]`, email.subject, '\n', email.body);
    });
    alert('Mensajes generados. Revisa la consola (F12) para validar asunto y cuerpo por proveedor.');

    this.isSending.set(true);
    const services = this.configService.catalog()?.services ?? [];
    const items: WorkItem[] = lines.map(l => {
      const service = services.find(s => s.id === l.id);
      const price = service?.price?.value ?? 0;
      return { materialId: l.id, quantity: l.quantity, partnerId: l.partnerId, price };
    });
    this.workService.confirmTechnicalVisit(id, items).subscribe({
      next: () => {
        this.isSending.set(false);
        this.router.navigate(['/engineer'], { queryParams: { success: 'solicitud-enviada' } });
      },
      error: (err) => {
        this.isSending.set(false);
        this.sendError.set(err?.message ?? 'Error al enviar la solicitud.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/engineer']);
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
