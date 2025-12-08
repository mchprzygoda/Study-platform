import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { CalendarEvent } from '../models/event.model';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  async addEvent(event: Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const user = this.authService.getUser();
    if (!user) throw new Error('User not logged in');

    // Check limit: max 200 events per user
    const eventsRef = collection(this.firestore, 'calendarEvents');
    const q = query(eventsRef, where('ownerId', '==', user.uid));
    const snapshot = await getDocs(q);
    
    if (snapshot.size >= 200) {
      throw new Error('Maximum limit of 200 events reached. Please delete some events before creating a new one.');
    }

    // Validate eventName length (1-200 characters)
    if (event.eventName.length < 1 || event.eventName.length > 200) {
      throw new Error('Event name must be between 1 and 200 characters.');
    }

    // Validate description length (max 1000 characters)
    if (event.description.length > 1000) {
      throw new Error('Event description cannot exceed 1000 characters.');
    }

    const normalizedDate = this.convertToDate(event.date);
    normalizedDate.setHours(0, 0, 0, 0);
    const eventDate = Timestamp.fromDate(normalizedDate);
    
    await addDoc(eventsRef, {
      ownerId: user.uid,
      date: eventDate,
      eventName: event.eventName,
      startTime: event.startTime,
      endTime: event.endTime,
      description: event.description,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  getEvents(): Observable<CalendarEvent[]> {
    return this.authService.userChanges().pipe(
      switchMap(user => {
        if (!user) return of([]);

        const eventsRef = collection(this.firestore, 'calendarEvents');
        const q = query(
          eventsRef,
          where('ownerId', '==', user.uid),
          orderBy('date', 'asc'),
          orderBy('startTime', 'asc')
        );
        return collectionData(q, { idField: 'id' }) as Observable<CalendarEvent[]>;
      })
    );
  }

  getEventsByDate(date: Date): Observable<CalendarEvent[]> {
    return this.authService.userChanges().pipe(
      switchMap(user => {
        if (!user) return of([]);

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const eventsRef = collection(this.firestore, 'calendarEvents');
        const q = query(
          eventsRef,
          where('ownerId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          orderBy('startTime', 'asc')
        );
        return collectionData(q, { idField: 'id' }) as Observable<CalendarEvent[]>;
      })
    );
  }

  getEventsByMonth(year: number, month: number): Observable<CalendarEvent[]> {
    return this.authService.userChanges().pipe(
      switchMap(user => {
        if (!user) return of([]);

        const startOfMonth = new Date(year, month, 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date(year, month + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const eventsRef = collection(this.firestore, 'calendarEvents');
        const q = query(
          eventsRef,
          where('ownerId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(startOfMonth)),
          where('date', '<=', Timestamp.fromDate(endOfMonth)),
          orderBy('date', 'asc'),
          orderBy('startTime', 'asc')
        );
        return collectionData(q, { idField: 'id' }) as Observable<CalendarEvent[]>;
      })
    );
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    // Validate eventName length if provided (1-200 characters)
    if (event.eventName !== undefined) {
      if (event.eventName.length < 1 || event.eventName.length > 200) {
        throw new Error('Event name must be between 1 and 200 characters.');
      }
    }

    // Validate description length if provided (max 1000 characters)
    if (event.description !== undefined) {
      if (event.description.length > 1000) {
        throw new Error('Event description cannot exceed 1000 characters.');
      }
    }

    const eventRef = doc(this.firestore, 'calendarEvents', eventId);
    
    const updateData: any = {
      ...event,
      updatedAt: Timestamp.now(),
    };

    delete updateData.date;

    if (event.date) {
      const normalizedDate = this.convertToDate(event.date);
      normalizedDate.setHours(0, 0, 0, 0);
      updateData.date = Timestamp.fromDate(normalizedDate);
    }

    await updateDoc(eventRef, updateData);
  }

  async deleteEvent(eventId: string): Promise<void> {
    const eventRef = doc(this.firestore, 'calendarEvents', eventId);
    await deleteDoc(eventRef);
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

