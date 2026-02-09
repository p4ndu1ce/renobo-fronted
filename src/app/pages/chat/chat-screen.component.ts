import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Send, Paperclip } from 'lucide-angular';

export interface ChatMessage {
  id: number;
  sender: 'user' | 'technician';
  text: string;
  time: string;
}

@Component({
  selector: 'app-chat-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chat-screen.component.html',
  styleUrl: './chat-screen.component.css',
})
export class ChatScreenComponent {
  private router = inject(Router);

  readonly icons = { ArrowLeft, Send, Paperclip };

  technicianName = 'Carlos Rodríguez';
  technicianInitials = 'CR';

  messages = signal<ChatMessage[]>([
    { id: 1, sender: 'technician', text: 'Hola, soy Carlos. Ya estoy en camino a tu ubicación.', time: '2:45 PM' },
    { id: 2, sender: 'user', text: 'Perfecto, te estaré esperando.', time: '2:46 PM' },
    { id: 3, sender: 'technician', text: '¿El problema es con todos los tomacorrientes o solo algunos?', time: '2:47 PM' },
    { id: 4, sender: 'user', text: 'Solo los de la sala principal', time: '2:48 PM' },
  ]);

  newMessage = signal('');

  sendMessage(): void {
    const text = this.newMessage().trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    this.messages.update((prev) => [...prev, { id: prev.length + 1, sender: 'user', text, time }]);
    this.newMessage.set('');
    setTimeout(() => {
      this.messages.update((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'technician',
          text: 'Entendido, revisaré eso cuando llegue.',
          time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 2000);
  }

  goBack(): void {
    this.router.navigate(['/tracking']);
  }
}
