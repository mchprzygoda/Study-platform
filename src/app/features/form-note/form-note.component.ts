import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-note',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-note.component.html'
})
export class FormNoteComponent {
  @Output() submit = new EventEmitter<{ title: string; content: string }>();
  @Output() cancel = new EventEmitter<void>();

  fb = new FormBuilder();
  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    content: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  onSubmit() {
    if (this.form.valid) {
      this.submit.emit(this.form.getRawValue());
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}