import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Camera, Upload, Image as ImageIcon, Send } from 'lucide-angular';
import { WorkService } from '../../services/work.service';

@Component({
  selector: 'app-service-request',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './service-request.component.html',
  styleUrl: './service-request.component.css',
})
export class ServiceRequestComponent implements OnInit {
  private router = inject(Router);
  private workService = inject(WorkService);

  readonly icons = { ArrowLeft, Camera, Upload, ImageIcon, Send };

  description = signal('');
  files = signal<string[]>([]);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  serviceData = signal<{ category: string; service: string } | null>(null);

  ngOnInit(): void {
    const state = history.state as { category?: string; service?: string } | undefined;
    if (state?.category != null && state?.service != null) {
      this.serviceData.set({ category: state.category, service: state.service });
    }
  }

  addFile(label: string): void {
    this.files.update((prev) => [...prev, `${label} ${prev.length + 1}`]);
  }

  submit(): void {
    const desc = this.description().trim();
    const data = this.serviceData();
    if (!desc || !data?.category || !data?.service) return;
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.workService.createServiceRequest(data.category, data.service, desc).subscribe({
      next: (res) => {
        const work = res.work;
        const requestCode = work?.requestCode ?? (work as { requestCode?: string })?.requestCode;
        if (work?.id) {
          this.router.navigate(['/request-success'], {
            state: { requestCode: requestCode ?? '', workId: work.id },
          });
        } else {
          this.errorMessage.set('No se recibió el ID de la solicitud.');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message ?? 'Error al crear la solicitud. Intenta de nuevo.');
        this.submitting.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/categories']);
  }
}
