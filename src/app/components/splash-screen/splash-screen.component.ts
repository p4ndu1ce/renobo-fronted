import { Component, output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RenoboBrandComponent } from '../renobo-brand/renobo-brand.component';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule, RenoboBrandComponent],
  template: `
    <div
      class="splash-screen min-h-screen bg-gradient-to-b from-[#FF5500] via-[#FF7700] to-background flex flex-col items-center justify-center"
      animate.enter="splash-enter"
      animate.leave="splash-leave">
      <div class="splash-logo" animate.enter="spring-logo-enter">
        <app-renobo-brand
          [logoSize]="120"
          textSize="xl"
          [animate]="true"
          [showSubtitle]="true" />
      </div>
    </div>
  `,
  styleUrl: './splash-screen.component.css',
})
export class SplashScreenComponent implements OnInit {
  private router = inject(Router);
  onComplete = output<void>();

  ngOnInit(): void {
    setTimeout(() => {
      this.onComplete.emit();
      this.router.navigate(['/login']);
    }, 3000);
  }
}
