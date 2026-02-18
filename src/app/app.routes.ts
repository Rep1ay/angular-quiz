import { Routes } from '@angular/router';
import { QuizPage } from './features/quiz/quiz-page/quiz-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'quiz' },
  { path: 'quiz', component: QuizPage },
];
