import { Pipe, PipeTransform } from '@angular/core';
import { CalendarEvent } from '../features/calendar/models/event.model';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'sortEvents',
  standalone: true
})
export class SortEventsPipe implements PipeTransform {
  transform(events: CalendarEvent[], orderBy: 'date' | 'time' = 'date', direction: 'asc' | 'desc' = 'asc'): CalendarEvent[] {
    if (!events || events.length === 0) {
      return [];
    }

    const sorted = [...events].sort((a, b) => {
      if (orderBy === 'date') {
        const dateA = this.convertToDate(a.date);
        const dateB = this.convertToDate(b.date);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return direction === 'asc' 
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }
        
        return this.compareTime(a.startTime, b.startTime, direction);
      } else {
        return this.compareTime(a.startTime, b.startTime, direction);
      }
    });

    return sorted;
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

  private compareTime(timeA: string, timeB: string, direction: 'asc' | 'desc'): number {
    const [hoursA, minutesA] = timeA.split(':').map(Number);
    const [hoursB, minutesB] = timeB.split(':').map(Number);
    
    const totalMinutesA = hoursA * 60 + minutesA;
    const totalMinutesB = hoursB * 60 + minutesB;
    
    return direction === 'asc' 
      ? totalMinutesA - totalMinutesB
      : totalMinutesB - totalMinutesA;
  }
}

