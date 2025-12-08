import { CommonModule, DatePipe } from "@angular/common";
import { Component, inject, computed, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { SubjectService } from "../subject/subject.service";
import { AuthService } from "../auth/auth.service";
import { NoteModel } from "../subject/note.model";
import { CardComponent } from "../../card/card.component";
import { CalendarService } from "../calendar/services/calendar.service";
import { CalendarEvent } from "../calendar/models/event.model";
import { Timestamp } from "@angular/fire/firestore";

interface RecentNote extends NoteModel {
  subjectId: string;
  subjectName: string;
}

interface DayEvents {
  date: Date;
  events: Array<CalendarEvent & { isPast?: boolean }>;
}

@Component({
  selector: 'study-platform',
  standalone: true,
  imports: [CommonModule, RouterModule, CardComponent, DatePipe],
  templateUrl: './study-platform.component.html',
  styleUrls: ['./study-platform.component.scss']
})
export class StudyPlatform {
  private subjectService = inject(SubjectService);
  private authService = inject(AuthService);
  private calendarService = inject(CalendarService);
  private router = inject(Router);

  readonly currentUser = this.authService.userSignal();
  readonly recentNotes = toSignal(this.subjectService.getRecentNotes(10), { 
    initialValue: [] as RecentNote[] 
  });

  readonly allEvents = toSignal(this.calendarService.getEvents(), {
    initialValue: [] as CalendarEvent[]
  });

  hidePastEvents = signal(false);

  readonly upcomingEvents = computed(() => {
    const now = new Date();
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date(todayStart);
    sevenDaysFromNow.setDate(todayStart.getDate() + 7);
    sevenDaysFromNow.setHours(0, 0, 0, 0);
    
    const upcoming = this.allEvents().filter(event => {
      const eventDate = this.convertToDate(event.date);
      const eventDateOnly = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      eventDateOnly.setHours(0, 0, 0, 0);
      
      return eventDateOnly >= todayStart && eventDateOnly < sevenDaysFromNow;
    });

    const grouped = new Map<string, Array<CalendarEvent & { isPast: boolean }>>();
    
    upcoming.forEach(event => {
      const eventDate = this.convertToDate(event.date);
      const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      
      const eventEndDateTime = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      const [hours, minutes] = event.endTime.split(':').map(Number);
      eventEndDateTime.setHours(hours, minutes, 0, 0);
      const isPast = eventEndDateTime < now;
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push({ ...event, isPast });
    });

    let result: DayEvents[] = Array.from(grouped.entries()).map(([dateKey, events]) => ({
      date: new Date(dateKey),
      events: events.sort((a, b) => {
        const [hoursA, minutesA] = a.startTime.split(':').map(Number);
        const [hoursB, minutesB] = b.startTime.split(':').map(Number);
        return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
      })
    }));

    if (this.hidePastEvents()) {
      result = result.map(dayEvents => ({
        ...dayEvents,
        events: dayEvents.events.filter((e: any) => !e.isPast)
      })).filter(dayEvents => dayEvents.events.length > 0);
    }

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  navigateToNote(note: RecentNote) {
    this.router.navigate(['/subjects'], { 
      queryParams: { subjectId: note.subjectId } 
    });
  }

  navigateToCalendar() {
    this.router.navigate(['/calendar']);
  }

  toggleHidePastEvents(): void {
    this.hidePastEvents.update(value => !value);
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
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