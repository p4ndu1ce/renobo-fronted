import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuildingLogoComponent } from '../building-logo/building-logo.component';

@Component({
  selector: 'app-renobo-brand',
  standalone: true,
  imports: [CommonModule, BuildingLogoComponent],
  template: `
    <div class="flex flex-col items-center" [class]="className()">
      <app-building-logo [size]="logoSize()" [animate]="animate()" />
      <h1
        [class]="textClass()"
        class="font-black text-white mt-2 tracking-wider drop-shadow-2xl font-poppins">
        RENOBO
      </h1>
      @if (showSubtitle()) {
        <p [class]="subtitleClass()" class="font-semibold text-white mt-1 font-outfit">
          Tu solución en reparaciones
        </p>
      }
    </div>
  `,
})
export class RenoboBrandComponent {
  logoSize = input<number>(80);
  textSize = input<'sm' | 'md' | 'lg' | 'xl'>('lg');
  animate = input<boolean>(false);
  showSubtitle = input<boolean>(false);
  className = input<string>('');

  textClass = computed(() => {
    const sizes = { sm: 'text-3xl', md: 'text-4xl', lg: 'text-5xl', xl: 'text-7xl' };
    return sizes[this.textSize()];
  });

  subtitleClass = computed(() => {
    const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
    return sizes[this.textSize()];
  });
}
