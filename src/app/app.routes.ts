import { Routes } from '@angular/router';
import { AuthComponent } from './features/auth/auth.component';
import { MainPage } from './page/main/main.page';
import { authGuard } from './features/auth/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { SubjectsPage } from './page/subjects/subjects.page';
import { QuizPage } from './page/quiz/quiz.page';
import { QuizComponent } from './features/quiz/components/quiz-list/quiz.component';
import { QuizDetailComponent } from './features/quiz/components/quiz-detail/quiz-detail.component';
import { QuizTakeComponent } from './features/quiz/components/quiz-take/quiz-take.component';
import { CalendarPage } from './page/calendar/calendar.page';

export const routes: Routes = [
  {
    path:'',
    pathMatch: 'full',
    redirectTo: 'main'
  },
  {
    path: 'main',
    component: MainPage,
    canActivate: [authGuard]
  },
  {
    path: 'login', 
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'subjects',
    component: SubjectsPage,
    canActivate: [authGuard]
  },
  {
    path: 'quiz',
    component: QuizPage,
    canActivate: [authGuard]
  },
  {
    path: 'quiz/:id',
    component: QuizPage,
    canActivate: [authGuard]
  },
  {
    path: 'quiz/:id/take',
    component: QuizTakeComponent,
    canActivate: [authGuard]
  },
  {
    path: 'calendar',
    component: CalendarPage,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'auth'
  }
];
