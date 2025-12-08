import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CalendarEvent } from '../../models/event.model';
import { Timestamp } from '@angular/fire/firestore';
import { ConfirmDeleteModalComponent } from '../../../../components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [CommonModule, ConfirmDeleteModalComponent],
  templateUrl: './event-modal.component.html',
  styleUrls: ['./event-modal.component.scss']
})
export class EventModalComponent {
  @Input() selectedDate: Date | null = null;
  @Input() events: CalendarEvent[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() editEvent = new EventEmitter<CalendarEvent>();
  @Output() deleteEvent = new EventEmitter<string>();

  isDeleteConfirmModalOpen = signal(false);
  eventToDelete = signal<{ id: string; name: string } | null>(null);

  sortedEvents = computed(() => {
    if (!this.selectedDate) return [];

    const dayEvents = this.events.filter(event => {
      const eventDate = this.convertToDate(event.date);
      
      return this.isSameDay(eventDate, this.selectedDate!);
    });

    return dayEvents.sort((a, b) => {
      const [hoursA, minutesA] = a.startTime.split(':').map(Number);
      const [hoursB, minutesB] = b.startTime.split(':').map(Number);
      const timeA = hoursA * 60 + minutesA;
      const timeB = hoursB * 60 + minutesB;
      return timeA - timeB;
    });
  });

  formattedDate = computed(() => {
    if (!this.selectedDate) return '';
    return this.selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  onEdit(event: CalendarEvent): void {
    this.editEvent.emit(event);
    this.closeModal();
  }

  onDelete(event: CalendarEvent): void {
    if (event.id) {
      this.eventToDelete.set({ id: event.id, name: event.eventName });
      this.isDeleteConfirmModalOpen.set(true);
    }
  }

  confirmDelete(): void {
    const event = this.eventToDelete();
    if (event) {
      this.deleteEvent.emit(event.id);
      this.closeDeleteConfirmModal();
    }
  }

  closeDeleteConfirmModal(): void {
    this.isDeleteConfirmModalOpen.set(false);
    this.eventToDelete.set(null);
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  }

  private convertToDate(date: Timestamp | Date): Date {
    if (date instanceof Date) {
      return date;
    }
    
    if (date instanceof Timestamp) {
      return date.toDate();
    }
    
    if (date && typeof (date as any).toDate === 'function') {
      return (date as any).toDate();
    }
    
    return new Date();
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
}

