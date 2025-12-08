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
  limit,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of, switchMap, map, from } from 'rxjs';
import { SubjectModel } from './subject.model';
import { AuthService } from '../auth/auth.service';
import { NoteModel } from './note.model';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  async addSubject(subject: { name: string; subjectType: string }): Promise<void> {
    const user = this.authService.getUser();
    if (!user) throw new Error('User not logged in');

    // Check limit: max 10 subjects per user
    const subjectsRef = collection(this.firestore, 'subjects');
    const q = query(subjectsRef, where('ownerId', '==', user.uid));
    const snapshot = await getDocs(q);
    
    if (snapshot.size >= 10) {
      throw new Error('Maximum limit of 10 subjects reached. Please delete a subject before creating a new one.');
    }

    // Validate name length (1-100 characters)
    if (subject.name.length < 1 || subject.name.length > 100) {
      throw new Error('Subject name must be between 1 and 100 characters.');
    }

    // Validate subjectType length (1-50 characters)
    if (subject.subjectType.length < 1 || subject.subjectType.length > 50) {
      throw new Error('Subject type must be between 1 and 50 characters.');
    }

    await addDoc(subjectsRef , {
      name: subject.name,
      subjectType: subject.subjectType,
      ownerId: user.uid
    })
  }

  async updateSubject(subjectId: string, subject: { name: string; subjectType: string }): Promise<void> {
    const user = this.authService.getUser();
    if (!user) throw new Error('User not logged in');

    // Validate name length (1-100 characters)
    if (subject.name.length < 1 || subject.name.length > 100) {
      throw new Error('Subject name must be between 1 and 100 characters.');
    }

    // Validate subjectType length (1-50 characters)
    if (subject.subjectType.length < 1 || subject.subjectType.length > 50) {
      throw new Error('Subject type must be between 1 and 50 characters.');
    }

    const subjectDocRef = doc(this.firestore, 'subjects', subjectId);
    await updateDoc(subjectDocRef, {
      name: subject.name.trim(),
      subjectType: subject.subjectType.trim()
    });
  }

  async deleteSubject(subjectId: string): Promise<void> {
    const user = this.authService.getUser();
    if (!user) throw new Error('User not logged in');

    // Delete all notes for this subject
    const notesRef = collection(this.firestore, `subjects/${subjectId}/notes`);
    const notesSnapshot = await getDocs(notesRef);
    const deleteNotesPromises = notesSnapshot.docs.map(noteDoc => 
      deleteDoc(doc(this.firestore, `subjects/${subjectId}/notes/${noteDoc.id}`))
    );
    await Promise.all(deleteNotesPromises);

    // Delete all quiz questions for this subject
    const quizQuestionsRef = collection(this.firestore, `quizzes/${subjectId}/questions`);
    const quizSnapshot = await getDocs(quizQuestionsRef);
    const deleteQuizPromises = quizSnapshot.docs.map(questionDoc => 
      deleteDoc(doc(this.firestore, `quizzes/${subjectId}/questions/${questionDoc.id}`))
    );
    await Promise.all(deleteQuizPromises);

    // Delete the subject itself
    const subjectDocRef = doc(this.firestore, 'subjects', subjectId);
    await deleteDoc(subjectDocRef);
  }

  getSubjects(): Observable<SubjectModel[]> {
    return this.authService.userChanges().pipe(
      switchMap(user => {
        if (!user) return of([]);

        const subjectsRef = collection(this.firestore, 'subjects');
        const q = query(subjectsRef, where('ownerId', '==', user.uid));
        return collectionData(q, { idField: 'id' }) as Observable<SubjectModel[]>;
      })
    );
  }

  getNotes(subjectId: string): Observable<NoteModel[]> {
    const notesRef = collection(this.firestore, `subjects/${subjectId}/notes`);
    return collectionData(notesRef, { idField: 'id' }) as Observable<NoteModel[]>;
  }

  async addNote(subjectId: string, note: { title: string; content: string }): Promise<void> {
    // Check limit: max 10 notes per subject
    const notesRef = collection(this.firestore, `subjects/${subjectId}/notes`);
    const snapshot = await getDocs(notesRef);
    
    if (snapshot.size >= 10) {
      throw new Error('Maximum limit of 10 notes per subject reached. Please delete a note before creating a new one.');
    }

    // Validate title length (1-200 characters)
    if (note.title.length < 1 || note.title.length > 200) {
      throw new Error('Note title must be between 1 and 200 characters.');
    }

    // Validate content length (max 5000 characters)
    if (note.content.length > 5000) {
      throw new Error('Note content cannot exceed 5000 characters.');
    }

    await addDoc(notesRef, {
      title: note.title,
      content: note.content,
      createdAt: Timestamp.now(),
    });
  }

  async updateNote(subjectId: string, noteId: string, note: { title: string; content: string }): Promise<void> {
    // Validate title length (1-200 characters)
    if (note.title.length < 1 || note.title.length > 200) {
      throw new Error('Note title must be between 1 and 200 characters.');
    }

    // Validate content length (max 5000 characters)
    if (note.content.length > 5000) {
      throw new Error('Note content cannot exceed 5000 characters.');
    }

    const noteDocRef = doc(this.firestore, `subjects/${subjectId}/notes/${noteId}`);
    await updateDoc(noteDocRef, {
      title: note.title,
      content: note.content,
      updatedAt: Timestamp.now(),
    });
  }

  async deleteNote(subjectId: string, noteId: string): Promise<void> {
    const noteDocRef = doc(this.firestore, `subjects/${subjectId}/notes/${noteId}`);
    await deleteDoc(noteDocRef);
  }

  getRecentNotes(limitCount: number = 5): Observable<Array<NoteModel & { subjectId: string; subjectName: string }>> {
    return this.authService.userChanges().pipe(
      switchMap(user => {
        if (!user) return of([]);

        return this.getSubjects().pipe(
          switchMap(subjects => {
            if (subjects.length === 0) return of([]);

            // Pobierz notatki ze wszystkich przedmiotów
            const notePromises = subjects.map(subject =>
              getDocs(
                query(
                  collection(this.firestore, `subjects/${subject.id}/notes`),
                  orderBy('createdAt', 'desc'),
                  limit(limitCount)
                )
              ).then(snapshot => 
                snapshot.docs.map(doc => ({
                  ...doc.data() as NoteModel,
                  id: doc.id,
                  subjectId: subject.id!,
                  subjectName: subject.name
                }))
              )
            );

            return from(Promise.all(notePromises)).pipe(
              map(allNotes => {
                // Połącz wszystkie notatki i posortuj po dacie
                const flattened = allNotes.flat();
                return flattened
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toMillis?.() || 0;
                    const bTime = b.createdAt?.toMillis?.() || 0;
                    return bTime - aTime;
                  })
                  .slice(0, limitCount);
              })
            );
          })
        );
      })
    );
  }
}