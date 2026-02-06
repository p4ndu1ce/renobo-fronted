import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-building-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './building-logo.component.html',
  styleUrl: './building-logo.component.css',
})
export class BuildingLogoComponent {
  size = input<number>(80);
  className = input<string>('');
  animate = input<boolean>(true);

  particles = [0, 1, 2, 3];
}
