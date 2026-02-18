import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { QuizContentService } from '../quiz-content/quiz-content.service';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [],
  templateUrl: './quiz-page.html',
  styleUrl: './quiz-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPage {
  private readonly quizContentService = inject(QuizContentService);

  protected readonly state$$ = this.quizContentService.state$$;

  protected readonly questionIndex$$ = signal(0);

  protected readonly totalQuestions$$ = computed(() => {
    const state = this.state$$();
    return state.status === 'ready' ? state.questions.length : 0;
  });

  protected readonly question$$ = computed(() => {
    const state = this.state$$();
    if (state.status !== 'ready') return null;

    return state.questions[this.questionIndex$$()] ?? null;
  });

  protected readonly questionNumber$$ = computed(() => this.questionIndex$$() + 1);

  protected readonly selectedOptionId$$ = signal<string | null>(null);
  protected readonly checked$$ = signal(false);

  protected readonly isCorrect$$ = computed(() => {
    const question = this.question$$();
    const selected = this.selectedOptionId$$();

    if (!question || !this.checked$$() || !selected) return null;

    return selected === question.correctOptionId;
  });

  private readonly resetOnQuestionChange = effect(() => {
    // Reset selection when the current question changes.
    this.question$$();
    this.resetAnswerState();
  });

  constructor() {
    this.quizContentService.ensureLoaded();
  }

  protected onSelect(optionId: string): void {
    this.selectedOptionId$$.set(optionId);
    this.checked$$.set(false);
  }

  protected checkAnswer(): void {
    if (!this.selectedOptionId$$()) return;

    this.checked$$.set(true);
  }

  protected getCorrectLabel(): string {
    const q = this.question$$();
    if (!q) return '';

    return q.options.find((o) => o.id === q.correctOptionId)?.label ?? '';
  }

  protected readonly canGoPrev$$ = computed(() => this.questionIndex$$() > 0);

  protected readonly canGoNext$$ = computed(() => {
    const total = this.totalQuestions$$();
    return total > 0 && this.questionIndex$$() < total - 1;
  });

  protected prev(): void {
    if (this.questionIndex$$() === 0) return;

    this.questionIndex$$.update((i) => i - 1);
  }

  protected next(): void {
    const total = this.totalQuestions$$();
    if (total === 0 || this.questionIndex$$() >= total - 1) return;

    this.questionIndex$$.update((i) => i + 1);
  }

  private resetAnswerState(): void {
    this.selectedOptionId$$.set(null);
    this.checked$$.set(false);
  }
}
