import { CommonModule } from "@angular/common";
import { Component, inject, signal, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SubjectService } from "./subject.service";
import { SubjectModel } from "./subject.model";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { toSignal } from "@angular/core/rxjs-interop";
import { NoteModel } from "./note.model";
import { CardComponent } from "../../card/card.component";
import { Subscription, firstValueFrom } from "rxjs";
import { filter, first } from "rxjs/operators";
import { SortNotesPipe } from "../../directives/sort-notes.pipe";
import { ConfirmDeleteModalComponent } from "../../components/confirm-delete-modal/confirm-delete-modal.component";

@Component({
  selector: 'app-subject',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    SortNotesPipe,
    ConfirmDeleteModalComponent
  ],
  templateUrl: './subject.component.html',
  styleUrls: ['./subject.component.scss']
})
export class SubjectComponent implements OnDestroy, OnInit {
  subjectService = inject(SubjectService);
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  
  private notesSubscription?: Subscription;
  private queryParamsSubscription?: Subscription;

  selectedSubject = signal<SubjectModel | null>(null);
  
  isSubjectModalOpen = signal(false);
  isNoteModalOpen = signal(false);
  isDeleteConfirmModalOpen = signal(false);
  
  isEditMode = signal(false);
  selectedNote = signal<NoteModel | null>(null);
  noteToDelete = signal<string | null>(null);
  noteToDeleteTitle = signal<string>('');

  isSubjectMenuOpen = signal(false);
  isSubjectEditMode = signal(false);
  subjectToDelete = signal<string | null>(null);
  subjectToDeleteName = signal<string>('');

  subjectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    subjectType: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]]
  });

  noteForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    content: ['', [Validators.required, Validators.maxLength(5000)]]
  });

  readonly subjects = toSignal(this.subjectService.getSubjects(), {
    initialValue: [] as SubjectModel[]
  });

  notes = signal<NoteModel[]>([]);

  ngOnInit() {
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      if (!params['subjectId']) return;
      
      const subjectId = params['subjectId'];
      
      this.subjectService.getSubjects().pipe(
        filter(subjects => subjects.length > 0),
        first()
      ).subscribe(subjects => {
        const subject = subjects.find(s => s.id === subjectId);
        
        if (subject) {
          setTimeout(() => {
            this.selectSubject(subject);
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {},
              replaceUrl: true
            });
          }, 150);
        }
      });
    });
  }

  openSubjectModal() {
    this.isSubjectEditMode.set(false);
    this.subjectForm.reset();
    this.isSubjectModalOpen.set(true);
  }

  closeSubjectModal() {
    this.isSubjectModalOpen.set(false);
    this.isSubjectEditMode.set(false);
    this.subjectForm.reset();
  }

  openEditSubjectModal() {
    const subject = this.selectedSubject();
    if (!subject) return;

    this.isSubjectEditMode.set(true);
    this.subjectForm.patchValue({
      name: subject.name,
      subjectType: subject.subjectType
    });
    this.isSubjectModalOpen.set(true);
    this.closeSubjectMenu();
  }

  async saveSubject() {
    if (this.subjectForm.invalid) return;

    const formValue = this.subjectForm.getRawValue();
    
    try {
      if (this.isSubjectEditMode() && this.selectedSubject()?.id) {
        await this.subjectService.updateSubject(this.selectedSubject()!.id!, {
          name: formValue.name.trim(),
          subjectType: formValue.subjectType.trim()
        });
        const updatedSubjects = await firstValueFrom(this.subjectService.getSubjects().pipe(first()));
        if (updatedSubjects) {
          const updated = updatedSubjects.find(s => s.id === this.selectedSubject()?.id);
          if (updated) {
            this.selectedSubject.set(updated);
          }
        }
      } else {
        await this.subjectService.addSubject({
          name: formValue.name.trim(),
          subjectType: formValue.subjectType.trim()
        });
      }
      this.closeSubjectModal();
    } catch (error) {
      console.error('Error saving subject:', error);
      alert(error instanceof Error ? error.message : 'Failed to save subject. Please try again.');
    }
  }

  async addSubject() {
    await this.saveSubject();
  }

  toggleSubjectMenu() {
    this.isSubjectMenuOpen.update(value => !value);
  }

  closeSubjectMenu() {
    this.isSubjectMenuOpen.set(false);
  }

  onDeleteSubject() {
    const subject = this.selectedSubject();
    if (!subject || !subject.id) return;

    this.subjectToDelete.set(subject.id);
    this.subjectToDeleteName.set(subject.name);
    this.isDeleteConfirmModalOpen.set(true);
    this.closeSubjectMenu();
  }

  async confirmDeleteSubject() {
    const subjectId = this.subjectToDelete();
    if (!subjectId) return;

    try {
      await this.subjectService.deleteSubject(subjectId);
      this.selectedSubject.set(null);
      this.notes.set([]);
      this.closeDeleteConfirmModal();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete subject. Please try again.');
      this.closeDeleteConfirmModal();
    }
  }

  selectSubject(subject: SubjectModel) {
    this.selectedSubject.set(subject);
    this.loadNotes(subject.id!);
  }

  loadNotes(subjectId: string) {
    if (this.notesSubscription) {
      this.notesSubscription.unsubscribe();
    }
    this.notesSubscription = this.subjectService.getNotes(subjectId).subscribe(notes => {
      this.notes.set(notes);
    });
  }

  ngOnDestroy() {
    if (this.notesSubscription) {
      this.notesSubscription.unsubscribe();
    }
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }

  openNoteModal(mode: 'create' | 'edit', note?: NoteModel) {
    if (mode === 'edit' && note) {
      this.isEditMode.set(true);
      this.selectedNote.set(note);
      this.noteForm.patchValue({
        title: note.title,
        content: note.content
      });
    } else {
      this.isEditMode.set(false);
      this.selectedNote.set(null);
      this.noteForm.reset();
    }
    this.isNoteModalOpen.set(true);
  }

  closeNoteModal() {
    this.isNoteModalOpen.set(false);
    this.isEditMode.set(false);
    this.selectedNote.set(null);
    this.noteForm.reset();
  }

  async saveNote() {
    if (this.noteForm.invalid || !this.selectedSubject()) return;

    const formValue = this.noteForm.getRawValue();
    const subjectId = this.selectedSubject()!.id!;

    try {
      if (this.isEditMode() && this.selectedNote()?.id) {
        await this.subjectService.updateNote(subjectId, this.selectedNote()!.id!, {
          title: formValue.title.trim(),
          content: formValue.content.trim()
        });
      } else {
        await this.subjectService.addNote(subjectId, {
          title: formValue.title.trim(),
          content: formValue.content.trim()
        });
      }
      this.loadNotes(subjectId);
      this.closeNoteModal();
    } catch (error) {
      console.error('Error saving note:', error);
      alert(error instanceof Error ? error.message : 'Failed to save note. Please try again.');
    }
  }

  async deleteNote(noteId: string) {
    if (!this.selectedSubject()) return;

    try {
      await this.subjectService.deleteNote(this.selectedSubject()!.id!, noteId);
      this.loadNotes(this.selectedSubject()!.id!);
    } catch (err) {
      console.error('Błąd podczas usuwania notatki:', err);
    }
  }

  onEditNote(note: NoteModel) {
    this.openNoteModal('edit', note);
  }

  onDeleteNote(note: NoteModel) {
    this.noteToDelete.set(note.id!);
    this.noteToDeleteTitle.set(note.title);
    this.isDeleteConfirmModalOpen.set(true);
  }

  confirmDelete(): void {
    if (this.noteToDelete()) {
      const noteId = this.noteToDelete();
      if (noteId) {
        this.deleteNote(noteId);
        this.closeDeleteConfirmModal();
      }
    } else if (this.subjectToDelete()) {
      this.confirmDeleteSubject();
    }
  }

  closeDeleteConfirmModal(): void {
    this.isDeleteConfirmModalOpen.set(false);
    this.noteToDelete.set(null);
    this.noteToDeleteTitle.set('');
    this.subjectToDelete.set(null);
    this.subjectToDeleteName.set('');
  }
}