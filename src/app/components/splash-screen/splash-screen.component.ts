import { Component, output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BuildingLogoComponent } from '../building-logo/building-logo.component';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule, BuildingLogoComponent],
  template: `
    <div
      class="splash-screen safe-area-top min-h-screen bg-[#FF5500] flex flex-col items-center justify-center overflow-hidden"
      animate.enter="splash-enter"
      animate.leave="splash-leave">
      <div class="splash-content flex flex-col items-center gap-4">
        <div class="splash-logo-wrap" animate.enter="logo-enter">
          <app-building-logo [size]="140" [animate]="false" class="splash-logo-icon" />
        </div>
        <h1
          class="splash-title font-black text-white tracking-wider drop-shadow-2xl font-advent"
          animate.enter="title-enter">
          RENOBO
        </h1>
        <p
          class="splash-subtitle font-semibold text-white/95 font-outfit"
          animate.enter="subtitle-enter">
          Tu solución en reparaciones
        </p>
      </div>
    </div>
  `,
  styleUrl: './splash-screen.component.css',
})
export class SplashScreenComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  onComplete = output<void>();

  ngOnInit(): void {
    setTimeout(() => {
      this.onComplete.emit();
      if (this.authService.isLoggedIn()) {
        if (this.authService.isSupervisor()) {
          this.router.navigate(['/supervisor']);
        } else if (this.authService.isPartner()) {
          this.router.navigate(['/partner']);
        } else {
          this.router.navigate(['/home']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    }, 2000);
  }
}
