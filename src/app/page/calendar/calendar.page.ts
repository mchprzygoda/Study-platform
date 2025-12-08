import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HeaderComponent } from '../../header/header.component';
import { FooterComponent } from '../../footer/footer.component';
import { CalendarViewComponent } from '../../features/calendar/components/calendar-view/calendar-view.component';
import { EventFormComponent } from '../../features/calendar/components/event-form/event-form.component';
import { EventListComponent } from '../../features/calendar/components/event-list/event-list.component';
import { EventModalComponent } from '../../features/calendar/components/event-modal/event-modal.component';
import { CalendarService } from '../../features/calendar/services/calendar.service';
import { CalendarEvent } from '../../features/calendar/models/event.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    HeaderComponent,
    FooterComponent,
    CalendarViewComponent,
    EventFormComponent,
    EventListComponent,
    EventModalComponent
  ],
  templateUrl: './calendar.page.html',
  styleUrls: ['./calendar.page.scss']
})
export class CalendarPage implements OnInit, OnDestroy {
  private calendarService = inject(CalendarService);
  
  selectedDate = signal<Date | null>(null);
  showModal = signal(false);
  editingEvent = signal<CalendarEvent | null>(null);
  currentMonth = signal(new Date());

  events = toSignal(this.calendarService.getEvents(), { initialValue: [] as CalendarEvent[] });
  private subscriptions = new Subscription();

  monthEvents = computed(() => {
    const month = this.currentMonth();
    return this.events().filter(event => {
      const eventDate = this.convertToDate(event.date);
      
      return eventDate.getMonth() === month.getMonth() &&
             eventDate.getFullYear() === month.getFullYear();
    });
  });

  selectedDateEvents = computed(() => {
    if (!this.selectedDate()) return [];
    
    return this.events().filter(event => {
      const eventDate = this.convertToDate(event.date);
      
      return this.isSameDay(eventDate, this.selectedDate()!);
    });
  });

  ngOnInit(): void {
    this.selectedDate.set(new Date());
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onDateSelected(date: Date): void {
    const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.selectedDate.set(selected);
    this.editingEvent.set(null);
  }

  onEventAdded(eventData: Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): void {
    this.calendarService.addEvent(eventData).then(() => {
      this.editingEvent.set(null);
    }).catch(error => {
      console.error('Error adding event:', error);
      alert(error instanceof Error ? error.message : 'Failed to add event. Please try again.');
    });
  }

  onEventUpdated(eventUpdate: { id: string; event: Partial<CalendarEvent> }): void {
    this.calendarService.updateEvent(eventUpdate.id, eventUpdate.event).then(() => {
      this.editingEvent.set(null);
    }).catch(error => {
      console.error('Error updating event:', error);
      alert(error instanceof Error ? error.message : 'Failed to update event. Please try again.');
    });
  }

  onEventDeleted(eventId: string): void {
    this.calendarService.deleteEvent(eventId).then(() => {
    }).catch(error => {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    });
  }

  onEditEvent(event: CalendarEvent): void {
    const eventDate = this.convertToDate(event.date);
    
    this.selectedDate.set(new Date(eventDate));
    this.editingEvent.set(event);
    this.showModal.set(false);
  }

  onModalClose(): void {
    this.showModal.set(false);
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
    
    return new Date(date as any);
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
}

