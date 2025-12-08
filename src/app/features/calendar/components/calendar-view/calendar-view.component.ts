import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, computed, OnInit } from '@angular/core';
import { CalendarEvent } from '../../models/event.model';
import { Timestamp } from '@angular/fire/firestore';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventCount: number;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit {
  @Input() set selectedDate(value: Date | null) {
    this._selectedDate.set(value);
  }
  get selectedDate(): Date | null {
    return this._selectedDate();
  }
  @Input() set events(value: CalendarEvent[]) {
    this._events.set(value);
  }
  get events(): CalendarEvent[] {
    return this._events();
  }
  @Output() dateSelected = new EventEmitter<Date>();
  @Output() monthChanged = new EventEmitter<Date>();

  private _selectedDate = signal<Date | null>(null);
  private _events = signal<CalendarEvent[]>([]);
  currentMonth = signal(new Date());
  today = new Date();
  
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays = computed(() => {
    const events = this._events();
    const year = this.currentMonth().getFullYear();
    const month = this.currentMonth().getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: CalendarDay[] = [];
    
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isSameDay(date, this.today),
        isSelected: this._selectedDate() ? this.isSameDay(date, this._selectedDate()!) : false,
        eventCount: this.getEventCountForDate(date, events)
      });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: this.isSameDay(date, this.today),
        isSelected: this._selectedDate() ? this.isSameDay(date, this._selectedDate()!) : false,
        eventCount: this.getEventCountForDate(date, events)
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isSameDay(date, this.today),
        isSelected: this._selectedDate() ? this.isSameDay(date, this._selectedDate()!) : false,
        eventCount: this.getEventCountForDate(date, events)
      });
    }
    
    return days;
  });

  currentMonthLabel = computed(() => {
    return `${this.monthNames[this.currentMonth().getMonth()]} ${this.currentMonth().getFullYear()}`;
  });

  ngOnInit(): void {
    this.currentMonth.set(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  }

  previousMonth(): void {
    const newDate = new Date(this.currentMonth());
    newDate.setMonth(newDate.getMonth() - 1);
    this.currentMonth.set(newDate);
    this.monthChanged.emit(newDate);
  }

  nextMonth(): void {
    const newDate = new Date(this.currentMonth());
    newDate.setMonth(newDate.getMonth() + 1);
    this.currentMonth.set(newDate);
    this.monthChanged.emit(newDate);
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.selectDate(today);
  }

  selectDate(date: Date): void {
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    this.dateSelected.emit(selectedDate);
    
    const selectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const currentMonthValue = this.currentMonth();
    const currentMonthStart = new Date(currentMonthValue.getFullYear(), currentMonthValue.getMonth(), 1);
    
    if (selectedMonth.getTime() !== currentMonthStart.getTime()) {
      this.currentMonth.set(selectedMonth);
      this.monthChanged.emit(selectedMonth);
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  private getEventCountForDate(date: Date, events: CalendarEvent[]): number {
    return events.filter(event => {
      const eventDate = this.convertToDate(event.date);
      
      return this.isSameDay(eventDate, date);
    }).length;
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

