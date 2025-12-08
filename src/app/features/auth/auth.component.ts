import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import { Router } from "@angular/router";


@Component({
  selector:'app-auth',
  imports: [ FormsModule ],
  standalone: true,
  templateUrl: './auth.component.html'
})
export class AuthComponent {
  isLoginMode = true;

  private router: Router = inject(Router);


  
}