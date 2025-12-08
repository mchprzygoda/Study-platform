import { Pipe, PipeTransform } from '@angular/core';
import { NoteModel } from '../features/subject/note.model';
import { Timestamp } from '@angular/fire/firestore';

@Pipe({
  name: 'sortNotes',
  standalone: true
})
export class SortNotesPipe implements PipeTransform {
  transform(notes: NoteModel[], direction: 'asc' | 'desc' = 'asc'): NoteModel[] {
    if (!notes || notes.length === 0) {
      return [];
    }

    return [...notes].sort((a, b) => {
      const dateA = this.getDateValue(a.createdAt);
      const dateB = this.getDateValue(b.createdAt);
      
      return direction === 'asc' 
        ? dateA - dateB
        : dateB - dateA;
    });
  }

  private getDateValue(createdAt: any): number {
    if (!createdAt) {
      return 0;
    }

    if (createdAt instanceof Date) {
      return createdAt.getTime();
    }

    if (createdAt instanceof Timestamp) {
      return createdAt.toMillis();
    }

    if (createdAt && typeof createdAt.toDate === 'function') {
      return createdAt.toDate().getTime();
    }

    if (typeof createdAt === 'number') {
      return createdAt;
    }

    if (typeof createdAt === 'string') {
      return new Date(createdAt).getTime();
    }

    if (createdAt?.seconds) {
      return createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000;
    }

    return 0;
  }
}


