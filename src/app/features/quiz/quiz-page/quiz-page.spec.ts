import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { QuizPage } from './quiz-page';
import { QuizContentService } from '../quiz-content/quiz-content.service';

const quizContentServiceStub = {
  state$$: signal({
    status: 'ready' as const,
    questions: [
      {
        id: 'q1',
        question: 'Test question?',
        options: [
          { id: '0', label: 'A' },
          { id: '1', label: 'B' },
          { id: '2', label: 'C' },
          { id: '3', label: 'D' },
        ],
        correctOptionId: '0',
        explanationMarkdown: 'Explanation',
      },
    ],
  }),
  ensureLoaded: () => {},
} satisfies Partial<QuizContentService>;

describe('QuizPage', () => {
  let component: QuizPage;
  let fixture: ComponentFixture<QuizPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizPage],
      providers: [{ provide: QuizContentService, useValue: quizContentServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the question title', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Angular Quiz');
  });

  it('renders a question', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Test question?');
  });

  it('renders question progress', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Question 1 of');
  });
});
