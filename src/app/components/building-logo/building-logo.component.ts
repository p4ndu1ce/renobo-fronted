import { Component, input } from '@angular/core';

/** Ruta relativa al base href: el navegador la resuelve solo (dev y Capacitor con base ./). */
const ICON_PATH = 'assets/icon-empty.png';

@Component({
  selector: 'app-building-logo',
  standalone: true,
  templateUrl: './building-logo.component.html',
  styleUrl: './building-logo.component.css',
})
export class BuildingLogoComponent {
  size = input<number>(80);
  className = input<string>('');
  animate = input<boolean>(true);

  readonly iconSrc = ICON_PATH;
}
