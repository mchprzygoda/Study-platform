import { Timestamp } from '@angular/fire/firestore';

export interface CalendarEvent {
  id?: string;
  ownerId: string;
  date: Timestamp | Date; 
  eventName: string; 
  startTime: string; 
  endTime: string; 
  description: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

