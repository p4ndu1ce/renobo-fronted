import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-button.component.html',
  styleUrl: './loading-button.component.css',
})
export class LoadingButtonComponent {
  label = input.required<string>();
  isLoading = input<boolean>(false);
  disabled = input<boolean>(false);
  btnClass = input<string>('');
  /** Estilo inline opcional (ej. background-color: #fa5404). */
  btnStyle = input<string>('');
  type = input<string>('button');

  clicked = output<void>();

  onClick(): void {
    if (this.isLoading() || this.disabled()) return;
    this.clicked.emit();
  }
}
