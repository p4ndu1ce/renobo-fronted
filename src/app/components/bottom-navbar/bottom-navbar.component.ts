import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bottom-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-navbar.component.html',
  styleUrl: './bottom-navbar.component.css',
})
export class BottomNavbarComponent {
  /** Rol del usuario: filtra ítems del menú (CLIENT / ENGINEER / SUPERVISOR). */
  userRole = inject(AuthService).userRole;
}
