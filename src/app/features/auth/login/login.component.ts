import { HttpClient } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { LogRegisterFormComponent } from "../logRegisterForm/form.component";
import { AuthService } from "../auth.service";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LogRegisterFormComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  isLoginOpen: boolean = true;

  fb = inject(FormBuilder);
  httpClient = inject(HttpClient);
  router = inject(Router);
  authService = inject(AuthService);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', Validators.required]
  });

  errorMessage: string | null = null;

  onSubmit(data: { email: string; password: string; username?: string }): void {
    this.errorMessage = null;
    
    this.authService
      .login(data.email, data.password)
      .subscribe({
        next: () => {
          this.errorMessage = null;
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          console.error('Login error:', err);
          if (err.code === 'auth/user-not-found' || 
              err.code === 'auth/wrong-password' || 
              err.code === 'auth/invalid-credential' ||
              err.code === 'auth/invalid-email') {
            this.errorMessage = 'Wrong e-mail or password. Please try again';
          } else {
            this.errorMessage = 'Wrong e-mail or password. Please try again';
          }
        },
      });
  }

  onErrorCleared(): void {
    this.errorMessage = null;
  }
}