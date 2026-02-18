import { DOCUMENT, ViewportScroller } from '@angular/common';
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
  private readonly viewportScroller = inject(ViewportScroller);
  private readonly document = inject(DOCUMENT);

  protected readonly state$$ = this.quizContentService.state$$;

  protected readonly questionIndex$$ = signal(0);

  protected readonly jumpToQuestion$$ = signal('1');

  protected readonly totalQuestions$$ = computed(() => {
    const state = this.state$$();
    return state.status === 'ready' ? state.questions.length : 0;
  });

  protected readonly question$$ = computed(() => {
    const state = this.state$$();
    if (state.status !== 'ready') return null;

    return state.questions[this.questionIndex$$()] ?? null;
  });

  protected readonly explanationHtml$$ = computed(() => {
    const question = this.question$$();
    if (!question) return '';

    return renderExplanationMarkdownAsHtml(question.explanationMarkdown);
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

    // Keep jump input in sync with the current question.
    this.jumpToQuestion$$.set(String(this.questionIndex$$() + 1));

    // On mobile, keep the new question in view after navigation.
    if (this.isMobileViewport()) {
      queueMicrotask(() => this.viewportScroller.scrollToPosition([0, 0]));
    }
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

  protected onJumpInput(value: string): void {
    this.jumpToQuestion$$.set(value);
  }

  protected jump(): void {
    const total = this.totalQuestions$$();
    if (total === 0) return;

    const raw = this.jumpToQuestion$$().trim();
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;

    const clamped = Math.min(Math.max(parsed, 1), total);
    this.questionIndex$$.set(clamped - 1);
  }

  private resetAnswerState(): void {
    this.selectedOptionId$$.set(null);
    this.checked$$.set(false);
  }

  private isMobileViewport(): boolean {
    const win = this.document.defaultView;
    if (!win?.matchMedia) return false;

    return win.matchMedia('(max-width: 600px)').matches;
  }
}

function renderExplanationMarkdownAsHtml(markdown: string): string {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const chunks: string[] = [];

  let inCodeBlock = false;
  let codeLang = '';
  let textLines: string[] = [];
  let codeLines: string[] = [];

  const flushText = () => {
    if (textLines.length === 0) return;
    const text = textLines.join('\n');
    chunks.push(`<div class="quiz__explanation-text">${renderInlineCode(text)}</div>`);
    textLines = [];
  };

  const flushCode = () => {
    const code = codeLines.join('\n');
    const langAttr = codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : '';
    chunks.push(
      `<pre class="quiz__code"><code${langAttr}>${escapeHtml(code)}</code></pre>`
    );
    codeLines = [];
    codeLang = '';
  };

  for (const rawLine of lines) {
    const line = rawLine ?? '';

    const fenceMatch = line.match(/^\s*```\s*([a-zA-Z0-9_-]+)?\s*$/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        flushText();
        inCodeBlock = true;
        codeLang = fenceMatch[1] ?? '';
        continue;
      }

      // Closing fence.
      inCodeBlock = false;
      flushCode();
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
    } else {
      textLines.push(line);
    }
  }

  if (inCodeBlock) {
    // Unclosed fence: treat as plain text for safety.
    textLines.push('```' + (codeLang ? ` ${codeLang}` : ''), ...codeLines);
    codeLines = [];
    codeLang = '';
    inCodeBlock = false;
  }

  flushText();

  return chunks.join('');
}

function renderInlineCode(text: string): string {
  // Split by backticks and wrap alternating segments.
  const parts = String(text ?? '').split('`');
  if (parts.length === 1) return escapeHtml(text);

  return parts
    .map((part, idx) => {
      const escaped = escapeHtml(part);
      // Odd indices are inline code segments.
      return idx % 2 === 1 ? `<code class="quiz__inline-code">${escaped}</code>` : escaped;
    })
    .join('');
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
