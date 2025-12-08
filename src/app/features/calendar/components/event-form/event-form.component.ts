import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CalendarEvent } from '../../models/event.model';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnChanges {
  @Input() selectedDate: Date | null = null;
  @Input() editingEvent: CalendarEvent | null = null;
  @Output() eventAdded = new EventEmitter<Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>();
  @Output() eventUpdated = new EventEmitter<{ id: string; event: Partial<CalendarEvent> }>();

  eventForm: FormGroup;
  isEditing = signal(false);
  editingEventId = signal<string | null>(null);

  constructor(private fb: FormBuilder) {
    this.eventForm = this.fb.group({
      eventName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
      description: ['', Validators.maxLength(1000)],
      startTime: ['09:00', Validators.required],
      endTime: ['10:00', Validators.required]
    });
  }

  get isFormValid(): boolean {
    return this.eventForm.valid && this.selectedDate !== null;
  }

  onSubmit(): void {
    if (!this.isFormValid || !this.selectedDate) {
      return;
    }

    const formValue = this.eventForm.value;

    if (this.compareTimes(formValue.startTime, formValue.endTime) >= 0) {
      alert('End time must be after start time');
      return;
    }

    const eventData: Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> = {
      date: this.selectedDate,
      eventName: formValue.eventName,
      startTime: formValue.startTime,
      endTime: formValue.endTime,
      description: formValue.description,
    };

    if (this.isEditing() && this.editingEventId()) {
      this.eventUpdated.emit({
        id: this.editingEventId()!,
        event: eventData
      });
      this.resetForm();
    } else {
      this.eventAdded.emit(eventData);
      this.resetForm();
    }
  }

  editEvent(event: CalendarEvent): void {
    this.isEditing.set(true);
    this.editingEventId.set(event.id || null);

    const eventDate = this.convertToDate(event.date);

    this.eventForm.patchValue({
      eventName: event.eventName,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime
    });
  }

  resetForm(): void {
    this.eventForm.reset({
      eventName: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00'
    });
    this.isEditing.set(false);
    this.editingEventId.set(null);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingEvent'] && this.editingEvent) {
      this.editEvent(this.editingEvent);
    } else if (changes['editingEvent'] && !this.editingEvent && !this.isEditing()) {
      this.resetForm();
    }
  }

  adjustTime(field: 'startTime' | 'endTime', hours: number): void {
    const currentTime = this.eventForm.get(field)?.value || '09:00';
    const [hoursStr, minutes] = currentTime.split(':');
    let currentHours = parseInt(hoursStr, 10);
    
    currentHours += hours;
    
    if (currentHours < 0) {
      currentHours = 23;
    } else if (currentHours > 23) {
      currentHours = 0;
    }
    
    const newTime = `${String(currentHours).padStart(2, '0')}:${minutes}`;
    this.eventForm.patchValue({ [field]: newTime });
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

  private compareTimes(time1: string, time2: string): number {
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);
    const totalMinutes1 = hours1 * 60 + minutes1;
    const totalMinutes2 = hours2 * 60 + minutes2;
    return totalMinutes1 - totalMinutes2;
  }
}

