import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LucideAngularModule, House, ClipboardList, Wrench, Settings, CreditCard } from 'lucide-angular';

@Component({
  selector: 'app-bottom-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './bottom-navbar.component.html',
  styleUrl: './bottom-navbar.component.css',
})
export class BottomNavbarComponent {
  private auth = inject(AuthService);
  userRole = this.auth.userRole;
  readonly icons = { House, ClipboardList, Wrench, Settings, CreditCard };
}
