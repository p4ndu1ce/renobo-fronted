import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Camera, Upload, Image as ImageIcon, Send } from 'lucide-angular';

@Component({
  selector: 'app-service-request',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './service-request.component.html',
  styleUrl: './service-request.component.css',
})
export class ServiceRequestComponent implements OnInit {
  private router = inject(Router);

  readonly icons = { ArrowLeft, Camera, Upload, ImageIcon, Send };

  description = signal('');
  files = signal<string[]>([]);

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
    if (!desc) return;
    this.router.navigate(['/budget'], {
      state: {
        category: this.serviceData()?.category,
        service: this.serviceData()?.service,
        description: desc,
        files: this.files(),
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/categories']);
  }
}
