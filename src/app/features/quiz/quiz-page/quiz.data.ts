export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 'signals-1',
    question: 'In Angular, what is a signal primarily used for?',
    options: [
      { id: 'a', label: 'To store reactive state and update bindings when it changes' },
      { id: 'b', label: 'To define application routes' },
      { id: 'c', label: 'To replace HttpClient for API calls' },
      { id: 'd', label: 'To register global event listeners in the browser' },
    ],
    correctOptionId: 'a',
    explanation:
      'Signals are a primitive for reactive state. When a signal changes, Angular can refresh any templates/computations that read it. This is especially important in zoneless apps, where you rely on explicit reactive state rather than Zone.js-triggered change detection.',
  },
  {
    id: 'zoneless-1',
    question: 'In a zoneless Angular app, what should typically trigger UI updates?',
    options: [
      { id: 'a', label: 'A random setTimeout() to force refresh' },
      { id: 'b', label: 'State changes (signals/inputs) and Angular events (click, input, etc.)' },
      { id: 'c', label: 'Zone.js monkey-patching of async APIs' },
      { id: 'd', label: 'Only manual calls to ChangeDetectorRef.detectChanges() everywhere' },
    ],
    correctOptionId: 'b',
    explanation:
      'Zoneless means Angular is not relying on Zone.js to know “something async happened”. You typically update state via signals/inputs, and Angular re-renders on those state changes and on framework-handled events. Manual detectChanges can be used, but it is not the default approach.',
  },
  {
    id: 'standalone-1',
    question: 'What is a key characteristic of a standalone component in Angular?',
    options: [
      { id: 'a', label: 'It must be declared in exactly one NgModule' },
      { id: 'b', label: 'It can be used directly in routes and imported by other standalone components' },
      { id: 'c', label: 'It can only use template-driven forms' },
      { id: 'd', label: 'It cannot use dependency injection' },
    ],
    correctOptionId: 'b',
    explanation:
      'Standalone components are designed to work without NgModules. They can be referenced directly in routes and composed by importing other standalone components/directives/pipes in their `imports` array.',
  },
  {
    id: 'onpush-1',
    question: 'What does ChangeDetectionStrategy.OnPush mainly change?',
    options: [
      { id: 'a', label: 'It disables change detection forever for the component' },
      { id: 'b', label: 'It limits checks to specific triggers like input changes and reactive state updates' },
      { id: 'c', label: 'It automatically makes every Observable hot' },
      { id: 'd', label: 'It replaces the need for signals' },
    ],
    correctOptionId: 'b',
    explanation:
      'OnPush reduces how often Angular checks a component. Updates happen for specific triggers (like input reference changes, events in the component, and reactive primitives like signals/async pipe updates), which typically improves performance and predictability.',
  },
  {
    id: 'di-1',
    question: 'What does `inject(SomeService)` do inside a component or service?',
    options: [
      { id: 'a', label: 'It creates a brand-new instance every time you call it' },
      { id: 'b', label: 'It retrieves a dependency from Angular’s injector in the current injection context' },
      { id: 'c', label: 'It only works in NgModules' },
      { id: 'd', label: 'It is the same as importing the class in TypeScript' },
    ],
    correctOptionId: 'b',
    explanation:
      '`inject()` is a functional DI API. It reads from the active injector when Angular is creating an instance (or inside other supported injection contexts). It does not bypass Angular DI and does not automatically create new instances unless the provider scope requires it.',
  },
  {
    id: 'routing-1',
    question: 'What is the main job of `<router-outlet>` in Angular?',
    options: [
      { id: 'a', label: 'To make HTTP requests' },
      { id: 'b', label: 'To render the currently activated route’s component' },
      { id: 'c', label: 'To enable two-way binding' },
      { id: 'd', label: 'To compile templates at runtime' },
    ],
    correctOptionId: 'b',
    explanation:
      '`<router-outlet>` is a placeholder where Angular Router inserts the component associated with the active route.',
  },
  {
    id: 'http-1',
    question: 'Which Angular class is commonly used to perform HTTP requests?',
    options: [
      { id: 'a', label: 'Router' },
      { id: 'b', label: 'HttpClient' },
      { id: 'c', label: 'NgZone' },
      { id: 'd', label: 'Renderer2' },
    ],
    correctOptionId: 'b',
    explanation:
      '`HttpClient` (from `@angular/common/http`) is the standard service for HTTP calls and integrates well with RxJS and interceptors.',
  },
  {
    id: 'rxjs-1',
    question: 'What does an RxJS Observable represent?',
    options: [
      { id: 'a', label: 'A synchronous value that never changes' },
      { id: 'b', label: 'A stream of values over time (possibly async)' },
      { id: 'c', label: 'A global singleton store built into Angular' },
      { id: 'd', label: 'A special type of Promise that always resolves twice' },
    ],
    correctOptionId: 'b',
    explanation:
      'Observables represent streams (0..n values) delivered over time. They are lazy by default and can be cancelled (unsubscribed) — which is a big difference vs Promises.',
  },
  {
    id: 'asyncpipe-1',
    question: 'Why is the `async` pipe often preferred over manual subscription in templates?',
    options: [
      { id: 'a', label: 'It automatically unsubscribes and updates the view when values arrive' },
      { id: 'b', label: 'It makes HTTP requests faster' },
      { id: 'c', label: 'It converts Observables into Signals without any overhead' },
      { id: 'd', label: 'It works only in zoneless apps' },
    ],
    correctOptionId: 'a',
    explanation:
      'The `async` pipe manages subscriptions for you and triggers view updates when new values come in. This reduces memory leaks and boilerplate.',
  },
  {
    id: 'lifecycle-1',
    question: 'Which lifecycle hook runs once after Angular first displays data-bound properties?',
    options: [
      { id: 'a', label: 'ngOnInit' },
      { id: 'b', label: 'ngDoCheck' },
      { id: 'c', label: 'ngAfterViewChecked' },
      { id: 'd', label: 'ngOnDestroy' },
    ],
    correctOptionId: 'a',
    explanation:
      '`ngOnInit` runs once after the first time Angular sets input properties and before the view is fully rendered. It’s commonly used for initialization logic.',
  },
  {
    id: 'template-syntax-1',
    question: 'What is the main purpose of the `@for` block in modern Angular templates?',
    options: [
      { id: 'a', label: 'To define a dependency injection provider' },
      { id: 'b', label: 'To loop over a list and render a template for each item' },
      { id: 'c', label: 'To enable server-side rendering' },
      { id: 'd', label: 'To generate routes automatically' },
    ],
    correctOptionId: 'b',
    explanation:
      '`@for` is a control-flow syntax for iterating collections in templates. It replaces older structural directive patterns in modern Angular, and supports tracking by a stable key.',
  },
];
