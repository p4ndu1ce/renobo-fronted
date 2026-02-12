import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowLeft, Send, Paperclip } from 'lucide-angular';
import { WorkService, type WorkChatMessage } from '../../services/work.service';
import { AuthService } from '../../services/auth.service';
import { EngineerService } from '../../services/engineer.service';

/** Mensaje para la vista: indica si es del usuario actual o del técnico y el texto/hora. */
export interface ChatMessageView {
  id: string;
  sender: 'user' | 'technician';
  text: string;
  time: string;
  createdAt: string;
}

@Component({
  selector: 'app-chat-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chat-screen.component.html',
  styleUrl: './chat-screen.component.css',
})
export class ChatScreenComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private workService = inject(WorkService);
  private authService = inject(AuthService);
  private engineerService = inject(EngineerService);

  readonly icons = { ArrowLeft, Send, Paperclip };

  workId = signal<string | null>(null);
  technicianName = signal<string>('Técnico');
  technicianInitials = signal<string>('??');
  messages = signal<ChatMessageView[]>([]);
  newMessage = signal('');
  loading = signal(true);
  sending = signal(false);
  error = signal<string | null>(null);

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_MS = 10000;

  ngOnInit(): void {
    const state = history.state as { workId?: string; engineerName?: string } | undefined;
    const workId = state?.workId ?? this.route.snapshot.queryParamMap.get('workId') ?? null;
    if (!workId) {
      this.router.navigate(['/tracking']);
      return;
    }
    this.workId.set(workId);
    if (state?.engineerName) {
      this.technicianName.set(state.engineerName);
      this.technicianInitials.set(this.getInitials(state.engineerName));
    } else {
      this.setEngineerNameFromWork(workId);
    }
    this.loadMessages();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private setEngineerNameFromWork(workId: string): void {
    const work =
      this.workService.myWorks().find((w) => w.id === workId) ??
      this.workService.works().find((w) => w.id === workId);
    if (!work) return;
    const isEngineer = this.authService.userRole() === 'ENGINEER';
    if (isEngineer) {
      const clientName = work.userName ?? work.userEmail ?? 'Cliente';
      this.technicianName.set(clientName);
      this.technicianInitials.set(this.getInitials(clientName));
    } else if (work.engineerId) {
      const list = this.engineerService.engineers();
      const eng = list.find((e) => e.id === work.engineerId);
      const name = eng?.name ?? work.engineerId;
      this.technicianName.set(name);
      this.technicianInitials.set(this.getInitials(name));
    }
  }

  private getInitials(name: string): string {
    return name
      .split(/\s+/)
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private toView(msg: WorkChatMessage): ChatMessageView {
    const currentUser = this.authService.currentUser();
    const isMe = currentUser?.email === msg.senderId || currentUser?.id === msg.senderId;
    const d = new Date(msg.createdAt);
    const time = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    return {
      id: msg.id,
      sender: isMe ? 'user' : 'technician',
      text: msg.text,
      time,
      createdAt: msg.createdAt,
    };
  }

  loadMessages(): void {
    const id = this.workId();
    if (!id) return;
    const isInitialLoad = this.messages().length === 0;
    if (isInitialLoad) this.loading.set(true);
    this.workService.getWorkMessages(id).subscribe({
      next: (list) => {
        const views = list.map((m) => this.toView(m)).reverse();
        this.messages.set(views);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los mensajes.');
      },
    });
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      if (this.workId()) this.loadMessages();
    }, this.POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  sendMessage(): void {
    const text = this.newMessage().trim();
    const id = this.workId();
    if (!text || !id) return;
    this.sending.set(true);
    this.newMessage.set('');
    this.workService.postWorkMessage(id, text).subscribe({
      next: (msg) => {
        this.messages.update((prev) => [...prev, this.toView(msg)]);
        this.sending.set(false);
      },
      error: () => {
        this.newMessage.set(text);
        this.sending.set(false);
        this.error.set('No se pudo enviar el mensaje.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/tracking']);
  }
}
