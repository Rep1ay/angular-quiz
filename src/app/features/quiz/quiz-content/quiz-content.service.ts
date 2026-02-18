import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanationMarkdown: string;
}

interface QuizQuestionsJson {
  questions: QuizQuestion[];
}

type QuizContentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; questions: QuizQuestion[] }
  | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class QuizContentService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  public readonly state$$ = signal<QuizContentState>({ status: 'idle' });

  public ensureLoaded(): void {
    const state = this.state$$();
    if (state.status === 'loading' || state.status === 'ready') return;

    this.state$$.set({ status: 'loading' });

    this.http
      .get<QuizQuestionsJson>('/quiz-questions.json')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.state$$.set({ status: 'ready', questions: data.questions ?? [] });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to load quiz content';
          this.state$$.set({ status: 'error', message });
        },
      });
  }
}
