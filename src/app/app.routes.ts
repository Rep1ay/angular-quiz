import { Routes } from '@angular/router';
import { InterviewPrepPage } from './features/interview-prep/interview-prep-page/interview-prep-page';
import { QuizPage } from './features/quiz/quiz-page/quiz-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'quiz' },
  { path: 'quiz', component: QuizPage },
  { path: 'interview-prep', component: InterviewPrepPage },
];
