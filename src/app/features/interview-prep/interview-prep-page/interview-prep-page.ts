import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

type PrepItem = {
  id: string;
  title: string;
  explanation: string;
  done: boolean;
};

type PrepSection = {
  id: string;
  title: string;
  period: string;
  summary: string;
  items: PrepItem[];
};

type PrepSectionTemplate = Omit<PrepSection, 'items'> & {
  items: Array<Omit<PrepItem, 'done'>>;
};

type KnowledgeTopic = {
  id: string;
  title: string;
  explanation: string;
  highlights: string[];
  done: boolean;
};

type KnowledgeBlock = {
  id: string;
  title: string;
  summary: string;
  topics: KnowledgeTopic[];
};

type KnowledgeBlockTemplate = Omit<KnowledgeBlock, 'topics'> & {
  topics: Array<Omit<KnowledgeTopic, 'done'>>;
};

type SourceLink = {
  url: string;
};

type NextGoal = {
  sectionTitle: string;
  itemTitle: string;
} | null;

const PREP_PROGRESS_STORAGE_KEY = 'interview-prep:progress-v2';
const KNOWLEDGE_PROGRESS_STORAGE_KEY = 'interview-prep:knowledge-v1';

const HTML_SOURCES: SourceLink[] = [
  { url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  { url: 'https://html.spec.whatwg.org/' },
  { url: 'https://web.dev/learn/html' },
];

const CSS_SOURCES: SourceLink[] = [
  { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS' },
  { url: 'https://web.dev/learn/css' },
  { url: 'https://css-tricks.com/snippets/css/complete-guide-grid/' },
];

const ANGULAR_VERSION_SOURCES: SourceLink[] = [
  { url: 'https://angular.dev' },
  { url: 'https://angular.dev/guide/templates/control-flow' },
  { url: 'https://angular.dev/guide/templates/defer' },
];

const FRONTEND_SECURITY_SOURCES: SourceLink[] = [
  { url: 'https://angular.dev/best-practices/security' },
  { url: 'https://owasp.org/www-project-top-ten/' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP' },
];

const TYPESCRIPT_SOURCES: SourceLink[] = [
  { url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html' },
  { url: 'https://www.typescriptlang.org/docs/handbook/2/conditional-types.html' },
  { url: 'https://www.typescriptlang.org/tsconfig#strict' },
];

const JAVASCRIPT_SOURCES: SourceLink[] = [
  { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' },
];

const PHASE_1_SOURCES: SourceLink[] = [
  { url: 'https://angular.dev/guide/components' },
  { url: 'https://angular.dev/guide/di' },
  { url: 'https://angular.dev/guide/routing' },
];

const PHASE_2_SOURCES: SourceLink[] = [
  { url: 'https://angular.dev/guide/signals' },
  { url: 'https://angular.dev/guide/zoneless' },
  { url: 'https://angular.dev/guide/hydration' },
];

const PHASE_3_SOURCES: SourceLink[] = [
  { url: 'https://rxjs.dev/guide/operators' },
  { url: 'https://angular.dev/best-practices/security' },
  { url: 'https://angular.dev/guide/testing' },
];

const PHASE_4_SOURCES: SourceLink[] = [
  { url: 'https://angular.dev/api/forms/ControlValueAccessor' },
  { url: 'https://angular.dev/guide/http/interceptors' },
  { url: 'https://web.dev/articles/rail' },
];

const KNOWLEDGE_BLOCKS: KnowledgeBlockTemplate[] = [
  {
    id: 'html-core',
    title: '1. HTML',
    summary: 'Core semantic and accessibility-first HTML topics expected from senior frontend engineers.',
    topics: [
      {
        id: 'html-semantics',
        title: 'Semantic structure and landmark usage',
        explanation: 'Use meaningful tags to improve maintainability, accessibility, and SEO clarity.',
        highlights: [
          'Use semantic landmarks (header/main/nav/section/article/footer) intentionally.',
          'Prefer native elements before custom wrappers to retain built-in behavior.',
          'Explain document outline decisions during architecture discussions.',
        ],
      },
      {
        id: 'html-a11y',
        title: 'Forms and accessibility fundamentals',
        explanation: 'Accessibility quality is a core senior expectation, not a final polish step.',
        highlights: [
          'Associate labels, controls, and errors correctly with ids/aria where needed.',
          'Preserve keyboard navigation and visible focus for all interactive elements.',
          'Use accessible names/roles only when native semantics are insufficient.',
        ],
      },
      {
        id: 'html-performance',
        title: 'Rendering and loading-aware markup',
        explanation: 'HTML decisions affect performance, hydration, and runtime behavior.',
        highlights: [
          'Use appropriate image/media attributes and avoid layout shift where possible.',
          'Understand script loading strategies (defer/async/module).',
          'Keep markup predictable for SSR and hydration.',
        ],
      },
    ],
  },
  {
    id: 'css-core',
    title: '2. CSS',
    summary: 'Layout, maintainability, and performance-oriented CSS practices for senior engineers.',
    topics: [
      {
        id: 'css-layout',
        title: 'Modern layout systems (Flexbox/Grid)',
        explanation: 'Confident layout design and debugging is essential for robust UI delivery.',
        highlights: [
          'Choose Grid for page/2D layout and Flexbox for component/1D alignment.',
          'Design responsive behavior with intrinsic sizing and fluid constraints.',
          'Avoid fragile absolute-position-only layouts except where appropriate.',
        ],
      },
      {
        id: 'css-architecture',
        title: 'Scalable styling architecture',
        explanation: 'Senior CSS should stay understandable as the app grows.',
        highlights: [
          'Use consistent naming and clear component boundaries.',
          'Leverage CSS custom properties/tokens for theming and consistency.',
          'Prevent specificity wars and unpredictable cascade side effects.',
        ],
      },
      {
        id: 'css-performance',
        title: 'Performance and accessibility in styling',
        explanation: 'Styling choices directly impact UX, readability, and runtime cost.',
        highlights: [
          'Use motion/animation intentionally and respect reduced-motion preferences.',
          'Prefer composited transforms/opacities for smoother interactions.',
          'Maintain contrast and readability across themes and breakpoints.',
        ],
      },
    ],
  },
  {
    id: 'javascript-core',
    title: '3. JavaScript',
    summary: 'Core language/runtime knowledge expected from senior engineers.',
    topics: [
      {
        id: 'js-async',
        title: 'Event loop and async behavior',
        explanation: 'Async correctness and performance depend on deep event loop understanding.',
        highlights: [
          'Know microtasks vs macrotasks and how promise chains schedule work.',
          'Reason about race conditions, cancellation, and retry strategies.',
          'Prevent UI jank by splitting heavy work and deferring non-critical tasks.',
        ],
      },
      {
        id: 'js-memory',
        title: 'Closures, memory, and object model',
        explanation: 'Many production issues are caused by hidden references and mutation patterns.',
        highlights: [
          'Use closures intentionally and avoid accidental retention/memory leaks.',
          'Understand prototype chain behavior and this binding rules.',
          'Prefer predictable immutability patterns for shared state.',
        ],
      },
      {
        id: 'js-runtime',
        title: 'Browser APIs and runtime constraints',
        explanation: 'Senior frontend engineers must reason about runtime behavior, not just syntax.',
        highlights: [
          'Use fetch, storage, and DOM APIs with security and performance in mind.',
          'Understand rendering pipeline basics and how code impacts paint/layout cost.',
          'Use profiling tools to validate assumptions with data.',
        ],
      },
    ],
  },
  {
    id: 'typescript-senior',
    title: '4. TypeScript',
    summary: 'Critical TypeScript capabilities expected from senior frontend engineers.',
    topics: [
      {
        id: 'ts-types',
        title: 'Advanced type modeling',
        explanation: 'Strong type models reduce bugs and improve refactoring safety in large apps.',
        highlights: [
          'Use generics, mapped types, conditional types, and utility types effectively.',
          'Model domain constraints with discriminated unions and exhaustive checks.',
          'Avoid any-heavy APIs and encode business rules in types.',
        ],
      },
      {
        id: 'ts-api-design',
        title: 'API and library contract design',
        explanation: 'Senior-level TS means designing predictable, ergonomic, and safe interfaces.',
        highlights: [
          'Design typed public APIs with stable contracts and minimal foot-guns.',
          'Use readonly and immutability patterns to prevent accidental shared-state mutation.',
          'Balance strictness with developer usability and inference quality.',
        ],
      },
      {
        id: 'ts-tooling',
        title: 'Compiler and tooling mastery',
        explanation: 'Configuration choices affect reliability, build speed, and migration confidence.',
        highlights: [
          'Understand strict mode implications and incremental migration paths.',
          'Use project references/tsconfig layering for large codebases.',
          'Treat type errors as design feedback, not just syntax problems.',
        ],
      },
    ],
  },
  {
    id: 'angular-versions',
    title: '5. Angular',
    summary: 'Most crucial interview highlights for Angular 17–21.',
    topics: [
      {
        id: 'ng17',
        title: 'Angular 17',
        explanation: 'Big shift toward modern template ergonomics and better first-load performance.',
        highlights: [
          'Built-in control flow syntax (@if, @for, @switch) became a practical baseline.',
          '@defer made lazy template loading much easier for real performance wins.',
          'Hydration and SSR DX improved, so discuss server-render strategy confidently.',
        ],
      },
      {
        id: 'ng18',
        title: 'Angular 18',
        explanation: 'Signals and rendering primitives became more mature for production adoption.',
        highlights: [
          'Signal-based patterns were used more broadly in real applications.',
          'SSR/hydration workflows and diagnostics continued to stabilize.',
          'Senior expectation: explain migration strategy instead of only listing features.',
        ],
      },
      {
        id: 'ng19',
        title: 'Angular 19',
        explanation: 'Modern APIs became the default mindset for new app architecture.',
        highlights: [
          'Standalone-first architecture and functional APIs were expected by default.',
          'Tooling and build flow improvements focused on faster feedback loops.',
          'Senior expectation: justify architecture trade-offs with team and project constraints.',
        ],
      },
      {
        id: 'ng20',
        title: 'Angular 20',
        explanation: 'Performance and developer productivity became central in enterprise adoption.',
        highlights: [
          'Signal-centric state architecture became the mainstream recommendation.',
          'Template and runtime improvements reduced unnecessary rendering work.',
          'Senior expectation: tie improvements to Core Web Vitals and maintainability.',
        ],
      },
      {
        id: 'ng21',
        title: 'Angular 21',
        explanation: 'Current major version with zoneless default and stronger modern stack direction.',
        highlights: [
          'Zoneless change detection is default in new apps; zone.js is no longer default-included.',
          'Signal Forms are experimental and should be discussed with adoption caveats.',
          'Vitest is default test runner; mention faster test loops and migration choices.',
        ],
      },
    ],
  },
  {
    id: 'frontend-security',
    title: '6. Security',
    summary: 'Most crucial FE security topics with practical interview-ready explanations.',
    topics: [
      {
        id: 'sec-xss',
        title: 'XSS prevention and safe rendering',
        explanation: 'Default Angular escaping helps, but unsafe HTML flows still require strict handling.',
        highlights: [
          'Treat all external/user content as untrusted input.',
          'Use sanitizer-safe flows for [innerHTML] and avoid bypass calls unless strictly required.',
          'Explain defense-in-depth: framework protection plus backend validation and CSP.',
        ],
      },
      {
        id: 'sec-auth',
        title: 'Auth token strategy and authorization boundaries',
        explanation: 'Frontend can guide UX, but backend must be the source of authorization truth.',
        highlights: [
          'Route guards improve UX, not security enforcement.',
          'Prefer short-lived access token patterns with secure refresh flows.',
          'Always enforce authorization on every backend endpoint.',
        ],
      },
      {
        id: 'sec-csrf',
        title: 'CSRF and HTTP hardening',
        explanation: 'Mutating requests need anti-CSRF strategy plus strong cookie/header policies.',
        highlights: [
          'Use Angular XSRF support with matching backend token validation.',
          'Set secure cookie attributes and strict CORS policy.',
          'Use interceptors for consistent auth and error handling behavior.',
        ],
      },
      {
        id: 'sec-ssr',
        title: 'SSR request pipeline security',
        explanation: 'SSR layers must validate host/forwarded headers and stay patched.',
        highlights: [
          'Keep @angular/ssr and dependencies up to date.',
          'Validate Host and X-Forwarded-* values before URL construction.',
          'Treat SSR as backend attack surface, not just frontend runtime.',
        ],
      },
    ],
  },
];

const PREP_SECTIONS: PrepSectionTemplate[] = [
  {
    id: 'phase-1',
    title: 'Phase 1: Fundamentals and Core Concepts',
    period: 'Week 1',
    summary: 'Refresh language, framework, and architecture fundamentals with strong trade-off explanations.',
    items: [
      {
        id: 'p1-standalone',
        title: 'Standalone-first architecture and lifecycle mastery',
        explanation:
          'Explain why standalone is default, when legacy NgModules still appear, and how lifecycle hooks affect rendering and cleanup.',
      },
      {
        id: 'p1-directives-di',
        title: 'Directive composition and advanced DI',
        explanation:
          'Cover structural syntax (@if/@for/@switch), attribute directives, hierarchical injectors, and resolution modifiers.',
      },
      {
        id: 'p1-routing-forms',
        title: 'Routing and forms trade-offs',
        explanation:
          'Prepare lazy loading with loadComponent/loadChildren, functional guards/resolvers, and Reactive Forms vs Signal Forms.',
      },
      {
        id: 'p1-typescript',
        title: 'Advanced TypeScript readiness',
        explanation:
          'Practice generics, utility types, and defensive typings you used in production to prevent regressions.',
      },
    ],
  },
  {
    id: 'phase-2',
    title: 'Phase 2: Modern Angular (Signals and Zoneless)',
    period: 'Weeks 1-3',
    summary: 'Demonstrate modern Angular mental models with concrete implementation patterns and migration decisions.',
    items: [
      {
        id: 'p2-signals-core',
        title: 'Signals, computed, and effect in real features',
        explanation:
          'Show writable vs readonly patterns, dependency tracking, custom equality, and side-effect boundaries.',
      },
      {
        id: 'p2-component-api',
        title: 'Signal component APIs',
        explanation:
          'Practice using input(), input.required(), output(), and model() with clear parent-child contracts.',
      },
      {
        id: 'p2-zoneless',
        title: 'Zoneless change detection strategy',
        explanation:
          'Explain bundle/startup benefits, explicit update flows, and how signals + OnPush reduce unnecessary checks.',
      },
      {
        id: 'p2-hydration',
        title: 'SSR and hydration readiness',
        explanation:
          'Use PendingTasks correctly and describe async timing issues that can break hydration consistency.',
      },
    ],
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Advanced and Senior-Level Depth',
    period: 'Weeks 2-5',
    summary: 'Cover async complexity, architecture decisions, performance, and security with practical examples.',
    items: [
      {
        id: 'p3-rxjs',
        title: 'RxJS operator decision framework',
        explanation:
          'Be ready to justify switchMap/exhaustMap/mergeMap/concatMap using user intent, cancellation, and backpressure.',
      },
      {
        id: 'p3-performance',
        title: 'Performance optimization toolkit',
        explanation:
          'Use @for track keys, @defer strategies, and profiling evidence; avoid expensive template function calls.',
      },
      {
        id: 'p3-state-architecture',
        title: 'State and architecture at scale',
        explanation:
          'Compare signals + services, hybrid RxJS approaches, and NgRx when team/process complexity justifies it.',
      },
      {
        id: 'p3-security',
        title: 'Security deep dive including February 2026 SSR issues',
        explanation:
          'Cover XSS, CSP, XSRF, auth boundaries, and SSR host/header validation plus patch cadence for @angular/ssr.',
      },
      {
        id: 'p3-testing',
        title: 'Testing strategy with Vitest',
        explanation:
          'Prepare examples across unit, integration, and E2E with stable mocking and anti-flakiness practices.',
      },
    ],
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Interview Simulation and Delivery',
    period: 'Weeks 4-8',
    summary: 'Practice delivery quality, coding under pressure, and leadership communication.',
    items: [
      {
        id: 'p4-coding',
        title: 'Targeted coding drills',
        explanation:
          'Implement CVA with signals, secure rich text, resilient interceptors, and list rendering optimization tasks.',
      },
      {
        id: 'p4-system-design',
        title: 'Frontend system design walkthroughs',
        explanation:
          'Practice architecture for real-time dashboards and migration plans with explicit security checkpoints.',
      },
      {
        id: 'p4-question-bank',
        title: 'Senior question bank rehearsal',
        explanation:
          'Rehearse answers on zoneless trade-offs, signal vs RxJS choices, and backend-authoritative security principles.',
      },
      {
        id: 'p4-mock',
        title: 'Full mock interviews with feedback loops',
        explanation: 'Run timed mock sessions and log improvement actions after each round.',
      },
    ],
  },
];

@Component({
  selector: 'app-interview-prep-page',
  standalone: true,
  imports: [],
  templateUrl: './interview-prep-page.html',
  styleUrl: './interview-prep-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewPrepPage {
  private readonly document = inject(DOCUMENT);

  protected readonly asOfDate = 'March 24, 2026';

  protected readonly knowledgeBlocks$$ = signal<KnowledgeBlock[]>(this.buildInitialKnowledgeBlocks());

  protected readonly sections$$ = signal<PrepSection[]>(this.buildInitialSections());

  protected readonly sectionDoneCountById$$ = computed(() => {
    const counts: Record<string, number> = {};
    for (const section of this.sections$$()) {
      counts[section.id] = section.items.filter((item) => item.done).length;
    }

    return counts;
  });

  protected readonly allItems$$ = computed(() =>
    this.sections$$().flatMap((section) =>
      section.items.map((item) => ({ sectionTitle: section.title, item }))
    )
  );

  protected readonly totalCount$$ = computed(() => this.allItems$$().length);

  protected readonly completedCount$$ = computed(
    () => this.allItems$$().filter(({ item }) => item.done).length
  );

  protected readonly percentComplete$$ = computed(() => {
    const total = this.totalCount$$();
    if (total === 0) return 0;

    return Math.round((this.completedCount$$() / total) * 100);
  });

  protected readonly nextGoal$$ = computed<NextGoal>(() => {
    const pending = this.allItems$$().find(({ item }) => !item.done);
    return pending ? { sectionTitle: pending.sectionTitle, itemTitle: pending.item.title } : null;
  });

  private readonly persistProgress = effect(() => {
    const doneIds = this.allItems$$()
      .filter(({ item }) => item.done)
      .map(({ item }) => item.id);

    this.writeDoneIds(doneIds);
  });

  private readonly persistKnowledgeProgress = effect(() => {
    const doneTopicIds = this.knowledgeBlocks$$()
      .flatMap((block) => block.topics)
      .filter((topic) => topic.done)
      .map((topic) => topic.id);

    this.writeKnowledgeDoneTopicIds(doneTopicIds);
  });

  protected setKnowledgeTopicDone(blockId: string, topicId: string, done: boolean): void {
    this.knowledgeBlocks$$.update((blocks) =>
      blocks.map((block) =>
        block.id !== blockId
          ? block
          : {
              ...block,
              topics: block.topics.map((topic) =>
                topic.id === topicId ? { ...topic, done } : topic
              ),
            }
      )
    );
  }

  protected resetKnowledgeProgress(): void {
    this.knowledgeBlocks$$.update((blocks) =>
      blocks.map((block) => ({
        ...block,
        topics: block.topics.map((topic) => ({ ...topic, done: false })),
      }))
    );
  }

  protected setItemDone(sectionId: string, itemId: string, done: boolean): void {
    this.sections$$.update((sections) =>
      sections.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, done } : item
              ),
            }
      )
    );
  }

  protected getKnowledgeSources(topicId: string): SourceLink[] {
    if (topicId.startsWith('html-')) return HTML_SOURCES;
    if (topicId.startsWith('css-')) return CSS_SOURCES;
    if (topicId.startsWith('ng')) return ANGULAR_VERSION_SOURCES;
    if (topicId.startsWith('sec-')) return FRONTEND_SECURITY_SOURCES;
    if (topicId.startsWith('ts-')) return TYPESCRIPT_SOURCES;
    if (topicId.startsWith('js-')) return JAVASCRIPT_SOURCES;

    return ANGULAR_VERSION_SOURCES;
  }

  protected getPrepItemSources(itemId: string): SourceLink[] {
    if (itemId.startsWith('p1-')) return PHASE_1_SOURCES;
    if (itemId.startsWith('p2-')) return PHASE_2_SOURCES;
    if (itemId.startsWith('p3-')) return PHASE_3_SOURCES;
    if (itemId.startsWith('p4-')) return PHASE_4_SOURCES;

    return PHASE_1_SOURCES;
  }

  private buildInitialSections(): PrepSection[] {
    const doneIds = new Set(this.readDoneIds());

    return PREP_SECTIONS.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        done: doneIds.has(item.id),
      })),
    }));
  }

  private buildInitialKnowledgeBlocks(): KnowledgeBlock[] {
    const doneTopicIds = new Set(this.readKnowledgeDoneTopicIds());

    return KNOWLEDGE_BLOCKS.map((block) => ({
      ...block,
      topics: block.topics.map((topic) => ({
        ...topic,
        done: doneTopicIds.has(topic.id),
      })),
    }));
  }

  private readDoneIds(): string[] {
    const storage = this.getStorage();
    if (!storage) return [];

    try {
      const raw = storage.getItem(PREP_PROGRESS_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private writeDoneIds(doneIds: string[]): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(PREP_PROGRESS_STORAGE_KEY, JSON.stringify(doneIds));
    } catch {
      return;
    }
  }

  private readKnowledgeDoneTopicIds(): string[] {
    const storage = this.getStorage();
    if (!storage) return [];

    try {
      const raw = storage.getItem(KNOWLEDGE_PROGRESS_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private writeKnowledgeDoneTopicIds(doneTopicIds: string[]): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(KNOWLEDGE_PROGRESS_STORAGE_KEY, JSON.stringify(doneTopicIds));
    } catch {
      return;
    }
  }

  private getStorage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
