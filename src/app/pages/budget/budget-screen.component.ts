import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ArrowLeft, Calendar, Clock, DollarSign, Check, User } from 'lucide-angular';
import { LucideIconsModule } from '../../shared/lucide-icons.module';

export interface TechnicianBudget {
  id: number;
  technicianName: string;
  rating: number;
  completedJobs: number;
  price: number;
  estimatedTime: string;
  availability: string;
  description: string;
}

@Component({
  selector: 'app-budget-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './budget-screen.component.html',
  styleUrl: './budget-screen.component.css',
})
export class BudgetScreenComponent {
  private router = inject(Router);

  readonly icons = { ArrowLeft, Calendar, Clock, DollarSign, Check, User };

  readonly budgets: TechnicianBudget[] = [
    {
      id: 1,
      technicianName: 'Carlos Rodríguez',
      rating: 4.8,
      completedJobs: 127,
      price: 350,
      estimatedTime: '2-3 horas',
      availability: 'Hoy a las 3:00 PM',
      description: 'Experto en instalaciones eléctricas con 10 años de experiencia',
    },
    {
      id: 2,
      technicianName: 'María González',
      rating: 4.9,
      completedJobs: 95,
      price: 320,
      estimatedTime: '2 horas',
      availability: 'Mañana a las 10:00 AM',
      description: 'Especialista certificada en sistemas eléctricos residenciales',
    },
    {
      id: 3,
      technicianName: 'José Martínez',
      rating: 4.7,
      completedJobs: 83,
      price: 380,
      estimatedTime: '3 horas',
      availability: 'Hoy a las 5:00 PM',
      description: 'Técnico con amplia experiencia en reparaciones de emergencia',
    },
  ];

  selectedBudgetId = signal<number | null>(null);
  selectedDate = signal('');
  selectedTime = signal('');

  today = new Date().toISOString().split('T')[0];

  selectBudget(id: number): void {
    this.selectedBudgetId.update((current) => (current === id ? null : id));
  }

  acceptAndSchedule(): void {
    const id = this.selectedBudgetId();
    const date = this.selectedDate();
    const time = this.selectedTime();
    if (id == null || !date || !time) return;
    const budget = this.budgets.find((b) => b.id === id);
    this.router.navigate(['/seguimiento'], {
      state: { budget, scheduledDate: date, scheduledTime: time },
    });
  }

  goBack(): void {
    this.router.navigate(['/request']);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  }
}
