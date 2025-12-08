import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CalendarEvent } from '../../models/event.model';
import { Timestamp } from '@angular/fire/firestore';
import { ConfirmDeleteModalComponent } from '../../../../components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, DatePipe, ConfirmDeleteModalComponent],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss']
})
export class EventListComponent {
  @Input() set events(value: CalendarEvent[]) {
    this._events.set(value);
  }
  get events(): CalendarEvent[] {
    return this._events();
  }
  @Input() set selectedDate(value: Date | null) {
    this._selectedDate.set(value);
  }
  get selectedDate(): Date | null {
    return this._selectedDate();
  }
  @Output() editEvent = new EventEmitter<CalendarEvent>();
  @Output() deleteEvent = new EventEmitter<string>();

  private _events = signal<CalendarEvent[]>([]);
  private _selectedDate = signal<Date | null>(null);

  isDeleteConfirmModalOpen = signal(false);
  eventToDelete = signal<{ id: string; name: string } | null>(null);

  processedEvents = computed(() => {
    const now = new Date();
    const eventsWithDate = this._events().map((event, index) => {
      const eventDate = this.convertToDate(event.date);
      
      const eventDateTime = new Date(eventDate);
      const [hours, minutes] = event.endTime.split(':').map(Number);
      eventDateTime.setHours(hours, minutes, 0, 0);
      const isPast = eventDateTime < now;
      
      return {
        ...event,
        eventDate,
        index: index + 1,
        isPast
      };
    });

    return eventsWithDate.sort((a, b) => {
      const [hoursA, minutesA] = a.startTime.split(':').map(Number);
      const [hoursB, minutesB] = b.startTime.split(':').map(Number);
      const timeA = hoursA * 60 + minutesA;
      const timeB = hoursB * 60 + minutesB;
      
      return timeA - timeB;
    });
  });

  formattedDate = computed(() => {
    const selected = this._selectedDate();
    if (!selected) return '';
    return selected.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  dayNumber = computed(() => {
    const selected = this._selectedDate();
    if (!selected) return '';
    return selected.getDate().toString();
  });

  monthShort = computed(() => {
    const selected = this._selectedDate();
    if (!selected) return '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[selected.getMonth()];
  });

  onEdit(event: CalendarEvent): void {
    this.editEvent.emit(event);
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
}
