import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ArrowLeft, MapPin, Package, FileText } from 'lucide-angular';
import { PartnerService, type PartnerJob } from '../../services/partner.service';

@Component({
  selector: 'app-partner-service-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './partner-service-detail.component.html',
  styleUrl: './partner-service-detail.component.css',
})
export class PartnerServiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partnerService = inject(PartnerService);

  workId = signal<string | null>(null);
  icons = { ArrowLeft, MapPin, Package, FileText };

  /** Servicio asignado al partner (por workId de la ruta). */
  job = computed(() => {
    const id = this.workId();
    if (!id) return null;
    return this.partnerService.activeJobs().find((j) => j.workId === id) ?? null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('workId');
    this.workId.set(id);
  }

  goBack(): void {
    this.router.navigate(['/partner']);
  }
}
