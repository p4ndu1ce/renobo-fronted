import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  computed,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { LucideAngularModule, Timer, MapPin, Camera, AlertTriangle, ChevronRight } from 'lucide-angular';
import { PartnerService, type PartnerJob } from '../../services/partner.service';
import { AuthService } from '../../services/auth.service';
import { CameraService } from '../../services/camera.service';
import { ToastService } from '../../services/toast.service';

export type TimeLeft = { hours: number; minutes: number; seconds: number; isCritical: boolean };

@Component({
  selector: 'app-partner-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './partner-tracking.component.html',
  styleUrl: './partner-tracking.component.css',
})
export class PartnerTrackingComponent implements OnInit, OnDestroy {
  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private cameraService = inject(CameraService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  /** true mientras se toma la foto o se sube al backend. */
  isUploadingPhoto = signal(false);

  icons = { Timer, MapPin, Camera, AlertTriangle, ChevronRight };

  /** Cronómetro: tiempo restante actualizado cada 1s por RxJS interval. */
  timeLeft = signal<TimeLeft>({ hours: 0, minutes: 0, seconds: 0, isCritical: false });
  private timerSubscription: Subscription | null = null;

  jobsLoading = this.partnerService.jobsLoading;
  activeJobs = this.partnerService.activeJobs;

  /** Obra activa mostrada (primera de la lista). "Mi Obra Activa". */
  job = computed(() => this.activeJobs()[0] ?? null);

  /** true si la obra actual tiene coordenadas para búsqueda de ferreterías. */
  hasJobCoordinates = computed(() => {
    const j = this.job();
    return !!(j?.coordinates?.lat != null && j?.coordinates?.lng != null);
  });

  /**
   * Clases Tailwind según tiempo restante:
   * > 12h: text-green-500 | < 12h: text-orange-500 | < 2h o crítico: text-red-500
   */
  timerColorClass = computed(() => {
    const t = this.timeLeft();
    if (t.isCritical || (t.hours === 0 && t.minutes === 0 && t.seconds === 0)) return 'text-red-500';
    if (t.hours < 2) return 'text-red-500';
    if (t.hours < 12) return 'text-orange-500';
    return 'text-green-500';
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const partnerId = this.authService.currentUser()?.id;
      if (partnerId) {
        this.partnerService.loadAssignedJobs(partnerId);
      }
      this.timerSubscription = interval(1000).subscribe(() => this.updateTimeLeft());
      this.updateTimeLeft();
    }
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = null;
  }

  private updateTimeLeft(): void {
    const j = this.job();
    if (!j?.expiresAt || j.status !== 'PENDING') {
      this.timeLeft.set({ hours: 0, minutes: 0, seconds: 0, isCritical: false });
      return;
    }
    const t = this.partnerService.calculateTimeRemaining(j.expiresAt);
    this.timeLeft.set({
      hours: t.hours,
      minutes: t.minutes,
      seconds: t.seconds,
      isCritical: t.isCritical,
    });
  }

  /**
   * Handshake: abre la cámara, captura la foto (con geolocalización si hay permisos),
   * la guarda en el dispositivo y la sube al backend vía PartnerService.
   */
  async handlePhotoUpload(action: 'START' | 'FINISH'): Promise<void> {
    const j = this.job();
    if (!j) return;
    if (this.isUploadingPhoto()) return;
    this.isUploadingPhoto.set(true);
    try {
      const photo = await this.cameraService.takePhoto();
      this.partnerService.uploadHandshakePhoto(j.workId, action, photo).subscribe({
        next: () => {
          this.isUploadingPhoto.set(false);
          this.toastService.show(
            action === 'START' ? 'Foto de inicio enviada correctamente.' : 'Foto de finalización enviada.',
            'success'
          );
          const partnerId = this.authService.currentUser()?.id;
          if (partnerId) this.partnerService.loadAssignedJobs(partnerId);
        },
        error: (err) => {
          this.isUploadingPhoto.set(false);
          this.toastService.show(err?.message ?? 'Error al subir la evidencia.', 'error');
        },
      });
    } catch (err) {
      this.isUploadingPhoto.set(false);
      const message = err instanceof Error ? err.message : String(err);
      if (message !== 'Captura cancelada.') {
        this.toastService.show(message, 'error');
      }
    }
  }

  goToChat(workId: string): void {
    this.router.navigate(['/chat'], { queryParams: { workId } });
  }

  /**
   * Búsqueda externa (Zero Cost): abre Google Maps con búsqueda "ferretería" centrada en la obra
   * o en la ubicación actual del usuario. Sin librerías de Google Places; bundle ligero.
   */
  openExternalSearch(): void {
    const j = this.job();
    if (!j) return;

    const openMaps = (lat: number, lng: number) => {
      const url = `https://www.google.com/maps/search/ferreteria/@${lat},${lng},15z`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (j.coordinates?.lat != null && j.coordinates?.lng != null) {
      openMaps(j.coordinates.lat, j.coordinates.lng);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => openMaps(pos.coords.latitude, pos.coords.longitude),
        () => this.toastService.show('No se pudo obtener la ubicación para buscar ferreterías.', 'error'),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
      return;
    }

    this.toastService.show('Ubicación no disponible para la búsqueda.', 'error');
  }
}
