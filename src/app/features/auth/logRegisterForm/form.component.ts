import { Component, EventEmitter, inject, Input, Output, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-log-register-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss']
})
export class LogRegisterFormComponent implements OnChanges, OnInit, OnDestroy {
  @Input() isLoginOpen: boolean = true;
  @Input() loginError: string | null = null;

  @Output() formSubmitted = new EventEmitter<{ 
    email: string; 
    password: string; 
    username?: string;
  }>();

  @Output() errorCleared = new EventEmitter<void>();

  fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  private subscriptions = new Subscription();

  ngOnInit(): void {
    const emailSub = this.form.get('email')?.valueChanges.subscribe(() => {
      if (this.loginError && this.isLoginOpen) {
        this.errorCleared.emit();
      }
    });

    const passwordSub = this.form.get('password')?.valueChanges.subscribe(() => {
      if (this.loginError && this.isLoginOpen) {
        this.errorCleared.emit();
      }
    });

    if (emailSub) this.subscriptions.add(emailSub);
    if (passwordSub) this.subscriptions.add(passwordSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isLoginOpen']) {
      const usernameControl = this.form.get('username');
      if (this.isLoginOpen) {
        usernameControl?.clearValidators();
        usernameControl?.updateValueAndValidity();
      } else {
        usernameControl?.setValidators([Validators.required]);
        usernameControl?.updateValueAndValidity();
      }
    }
    
    if (changes['isLoginOpen'] || changes['loginError']) {
      if (this.loginError) {
        this.form.markAllAsTouched();
      }
    }
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    
    if (this.form.valid) {
      this.formSubmitted.emit(this.form.getRawValue());
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      if (controlName === 'username') return 'Username is required';
      if (controlName === 'email') return 'Email is required';
      if (controlName === 'password') return 'Password is required';
    }

    if (control.errors['email']) {
      return 'Invalid email address';
    }

    if (control.errors['minlength']) {
      return 'Password must be at least 8 characters long';
    }

    return '';
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.touched && control.invalid);
  }
}
