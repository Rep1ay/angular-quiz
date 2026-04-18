import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

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

type GoalItem = {
  stepNumber: number;
  sectionTitle: string;
  itemTitle: string;
};

type LearningStep = {
  kind: 'knowledge' | 'phase';
  parentId: string;
  id: string;
  sectionTitle: string;
  title: string;
  explanation: string;
  done: boolean;
  highlights: string[];
};

type FilteredStep = LearningStep & {
  originalStepNumber: number;
};

type InterviewQa = {
  question: string;
  answer: string;
};

type ReadStartOption = {
  value: string;
  label: string;
};

type SpeechLanguageOption = {
  value: string;
  label: string;
};

const PREP_PROGRESS_STORAGE_KEY = 'interview-prep:progress-v2';
const KNOWLEDGE_PROGRESS_STORAGE_KEY = 'interview-prep:knowledge-v1';

const SECTION_INTERVIEW_QA: Record<string, InterviewQa[]> = {
  'knowledge:html-core': [
    {
      question: 'When do you use semantic landmarks instead of generic div wrappers?',
      answer:
        'Use semantic landmarks by default because they improve accessibility navigation, document meaning, and maintainability. Use generic wrappers only when no native element expresses intent.',
    },
    {
      question: 'How do you make complex forms accessible in production?',
      answer:
        'Bind labels to controls, expose errors with descriptive text and proper associations, preserve keyboard flow, and test with real screen readers in addition to automated audits.',
    },
    {
      question: 'How does HTML affect performance and hydration?',
      answer:
        'Stable, predictable markup reduces hydration mismatches and layout shift. Proper media attributes and script-loading strategy improve startup and runtime performance.',
    },
  ],
  'knowledge:css-core': [
    {
      question: 'Grid vs Flexbox: how do you choose in interviews?',
      answer:
        'Use Grid for page-level or two-dimensional layouts, and Flexbox for one-dimensional alignment inside components. I explain this as a constraint-driven decision, not a preference.',
    },
    {
      question: 'How do you avoid CSS scaling problems in large apps?',
      answer:
        'Keep clear component boundaries, consistent naming, and tokenized values via CSS variables. The goal is predictable cascade behavior and low specificity conflict.',
    },
    {
      question: 'What CSS choices improve UX performance?',
      answer:
        'Prefer transform/opacity animations, avoid layout-thrashing patterns, and respect reduced-motion. I validate changes with real rendering/perf tooling.',
    },
  ],
  'knowledge:javascript-core': [
    {
      question: 'Explain microtasks vs macrotasks with a practical example.',
      answer:
        'Promise callbacks run in the microtask queue before timers in the macrotask queue. This ordering explains many UI timing issues and race-condition bugs.',
    },
    {
      question: 'How do closures cause memory issues?',
      answer:
        'Closures can keep references alive unintentionally. I minimize retained objects, remove listeners/subscriptions, and profile memory snapshots when leaks are suspected.',
    },
    {
      question: 'How do you keep browser runtime work smooth?',
      answer:
        'Break heavy work into smaller chunks, defer non-critical tasks, and use profiling to confirm paint/layout costs are controlled.',
    },
    {
      question: 'What is tree shaking and why does it matter for Angular apps?',
      answer:
        'Tree shaking is dead code elimination at build time that removes unused exports from the bundle. It relies on ES module static analysis. In Angular, providedIn: root services are tree-shakable, and avoiding barrel re-exports and CommonJS imports helps the bundler prune more aggressively, reducing bundle size.',
    },
    {
      question: 'How do you ensure a library is tree-shakable?',
      answer:
        'Use ES module exports, set sideEffects: false in package.json, avoid top-level side effects in module scope, prefer named exports over namespace re-exports, and verify with bundle analyzer tools that unused code is actually dropped.',
    },
  ],
  'knowledge:typescript-senior': [
    {
      question: 'What does advanced type modeling buy the team?',
      answer:
        'It catches invalid states at compile time, improves refactoring confidence, and documents domain rules directly in the type system.',
    },
    {
      question: 'How strict should TypeScript be in real projects?',
      answer:
        'Strict-by-default is ideal, but rollout can be incremental. I prioritize high-risk boundaries first and avoid blocking delivery with low-value type churn.',
    },
    {
      question: 'How do you design ergonomic but safe APIs in TS?',
      answer:
        'Favor inference-friendly signatures, readonly contracts where possible, and explicit discriminated unions for branching behavior.',
    },
  ],
  'knowledge:angular-versions': [
    {
      question: 'What changed most in modern Angular versions?',
      answer:
        'Standalone architecture, built-in control flow, signals adoption, and zoneless direction shifted Angular toward simpler, more explicit reactive patterns.',
    },
    {
      question: 'How do you decide between Signals and RxJS?',
      answer:
        'Signals are great for local synchronous state graphs; RxJS remains strong for async streams, cancellation, and event composition. Many real apps use both intentionally.',
    },
    {
      question: 'How do you discuss migration in interviews?',
      answer:
        'I explain incremental migration with risk control: feature-by-feature adoption, measurable perf outcomes, and rollback-safe changes.',
    },
  ],
  'knowledge:frontend-security': [
    {
      question: 'How do you prevent XSS in Angular applications?',
      answer:
        'Rely on Angular default escaping, treat all external content as untrusted, avoid bypass APIs unless absolutely required, and enforce backend validation plus CSP.',
    },
    {
      question: 'Why are route guards not enough for authorization?',
      answer:
        'Guards improve UX only; true authorization must be enforced server-side on every protected endpoint.',
    },
    {
      question: 'What is special about SSR security?',
      answer:
        'SSR is backend attack surface. Validate host/forwarded headers, keep dependencies patched, and audit request pipeline behavior like any server component.',
    },
  ],
  'phase:phase-1': [
    {
      question: 'How do you justify standalone-first architecture to a team?',
      answer:
        'It reduces module ceremony, improves clarity, and aligns with modern Angular defaults while still allowing incremental coexistence with legacy module-based code.',
    },
    {
      question: 'What trade-offs do you mention for routing/forms decisions?',
      answer:
        'I compare maintainability, DX, and migration cost, then choose patterns that keep complexity local and testability high.',
    },
  ],
  'phase:phase-2': [
    {
      question: 'What is your signal architecture baseline?',
      answer:
        'Writable signals for local state, computed for derived state, and effects for side effects only. This keeps data flow explicit and easy to reason about.',
    },
    {
      question: 'How do you explain zoneless adoption?',
      answer:
        'I present it as a performance and predictability move, then describe required explicit update patterns and rollout strategy to avoid regressions.',
    },
  ],
  'phase:phase-3': [
    {
      question: 'How do you pick the right RxJS mapping operator?',
      answer:
        'I map operator choice to user intent: switchMap for latest-only, exhaustMap for ignore-while-running, concatMap for ordering, mergeMap for parallelism.',
    },
    {
      question: 'How do you prove performance improvements?',
      answer:
        'I measure before/after with profiling and vitals, then connect changes to concrete bottlenecks rather than relying on assumptions.',
    },
  ],
  'phase:phase-4': [
    {
      question: 'How do you approach live coding in senior interviews?',
      answer:
        'I narrate trade-offs, keep increments small and testable, and optimize for clarity/correctness first before micro-optimizations.',
    },
    {
      question: 'How do you answer system design questions effectively?',
      answer:
        'I structure by requirements, constraints, architecture, failure/security concerns, and measurable rollout plan with monitoring.',
    },
  ],
};

const STEP_SOURCES: Record<string, SourceLink[]> = {
  'html-semantics': [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element' },
    { url: 'https://html.spec.whatwg.org/multipage/semantics.html' },
  ],
  'html-a11y': [
    { url: 'https://developer.mozilla.org/en-US/docs/Learn/Accessibility/HTML' },
    { url: 'https://www.w3.org/WAI/tutorials/forms/' },
    { url: 'https://web.dev/learn/accessibility/' },
  ],
  'html-performance': [
    { url: 'https://web.dev/articles/render-blocking-resources' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer' },
  ],
  'css-layout': [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout' },
    { url: 'https://web.dev/learn/css/grid' },
  ],
  'css-architecture': [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties' },
    { url: 'https://getbem.com/introduction/' },
    { url: 'https://web.dev/learn/css' },
  ],
  'css-performance': [
    { url: 'https://web.dev/articles/animations-guide' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion' },
    { url: 'https://web.dev/articles/optimize-cls' },
  ],
  'js-async': [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController' },
  ],
  'js-memory': [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap' },
  ],
  'js-runtime': [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame' },
    { url: 'https://web.dev/articles/rendering-performance' },
  ],
  'js-tree-shaking': [
    { url: 'https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking' },
    { url: 'https://webpack.js.org/guides/tree-shaking/' },
    { url: 'https://angular.dev/guide/build' },
  ],
  'ts-types': [
    { url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html' },
    { url: 'https://www.typescriptlang.org/docs/handbook/2/conditional-types.html' },
    { url: 'https://www.typescriptlang.org/docs/handbook/2/mapped-types.html' },
  ],
  'ts-api-design': [
    { url: 'https://www.typescriptlang.org/docs/handbook/2/functions.html' },
    { url: 'https://www.typescriptlang.org/docs/handbook/2/objects.html' },
    { url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html' },
  ],
  'ts-tooling': [
    { url: 'https://www.typescriptlang.org/tsconfig#strict' },
    { url: 'https://www.typescriptlang.org/docs/handbook/project-references.html' },
    { url: 'https://www.typescriptlang.org/tsconfig#incremental' },
  ],
  ng17: [
    { url: 'https://angular.dev/guide/templates/control-flow' },
    { url: 'https://angular.dev/guide/templates/defer' },
    { url: 'https://angular.dev/guide/hydration' },
  ],
  ng18: [
    { url: 'https://angular.dev/guide/signals' },
    { url: 'https://angular.dev/guide/hydration' },
    { url: 'https://angular.dev/update-guide' },
  ],
  ng19: [
    { url: 'https://angular.dev/guide/components' },
    { url: 'https://angular.dev/guide/routing' },
    { url: 'https://angular.dev/guide/di' },
  ],
  ng20: [
    { url: 'https://angular.dev/guide/signals' },
    { url: 'https://angular.dev/guide/zoneless' },
    { url: 'https://angular.dev/roadmap' },
  ],
  ng21: [
    { url: 'https://angular.dev/guide/zoneless' },
    { url: 'https://angular.dev/guide/testing' },
    { url: 'https://angular.dev/roadmap' },
  ],
  'sec-xss': [
    { url: 'https://angular.dev/best-practices/security' },
    { url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP' },
  ],
  'sec-auth': [
    { url: 'https://angular.dev/guide/routing/route-guards' },
    { url: 'https://oauth.net/2/' },
    { url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html' },
  ],
  'sec-csrf': [
    { url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html' },
    { url: 'https://angular.dev/best-practices/security' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite' },
  ],
  'sec-ssr': [
    { url: 'https://angular.dev/best-practices/security' },
    { url: 'https://portswigger.net/web-security/host-header' },
    { url: 'https://owasp.org/www-project-top-ten/' },
  ],
  'p1-standalone': [
    { url: 'https://angular.dev/guide/components' },
    { url: 'https://angular.dev/guide/components/lifecycle' },
    { url: 'https://angular.dev/guide/di' },
  ],
  'p1-directives-di': [
    { url: 'https://angular.dev/guide/directives' },
    { url: 'https://angular.dev/guide/di' },
    { url: 'https://angular.dev/guide/templates/control-flow' },
  ],
  'p1-routing-forms': [
    { url: 'https://angular.dev/guide/routing' },
    { url: 'https://angular.dev/guide/forms' },
    { url: 'https://angular.dev/guide/forms/reactive-forms' },
  ],
  'p1-typescript': [
    { url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html' },
    { url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html' },
    { url: 'https://www.typescriptlang.org/tsconfig#strict' },
  ],
  'p2-signals-core': [
    { url: 'https://angular.dev/guide/signals' },
    { url: 'https://angular.dev/guide/signals#computed-signals' },
    { url: 'https://angular.dev/guide/signals#effects' },
  ],
  'p2-component-api': [
    { url: 'https://angular.dev/guide/components/inputs' },
    { url: 'https://angular.dev/guide/components/outputs' },
    { url: 'https://angular.dev/guide/templates/two-way-binding' },
  ],
  'p2-zoneless': [
    { url: 'https://angular.dev/guide/zoneless' },
    { url: 'https://angular.dev/guide/signals' },
    { url: 'https://angular.dev/guide/hydration' },
  ],
  'p2-hydration': [
    { url: 'https://angular.dev/guide/hydration' },
    { url: 'https://angular.dev/guide/ssr' },
    { url: 'https://angular.dev/api/core/PendingTasks' },
  ],
  'p3-rxjs': [
    { url: 'https://rxjs.dev/guide/operators' },
    { url: 'https://rxjs.dev/api/operators/switchMap' },
    { url: 'https://rxjs.dev/api/operators/exhaustMap' },
  ],
  'p3-performance': [
    { url: 'https://angular.dev/guide/templates/defer' },
    { url: 'https://angular.dev/guide/templates/control-flow' },
    { url: 'https://web.dev/articles/rail' },
  ],
  'p3-state-architecture': [
    { url: 'https://angular.dev/guide/signals' },
    { url: 'https://rxjs.dev/guide/subject' },
    { url: 'https://ngrx.io/guide/store' },
  ],
  'p3-security': [
    { url: 'https://angular.dev/best-practices/security' },
    { url: 'https://owasp.org/www-project-top-ten/' },
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP' },
  ],
  'p3-testing': [
    { url: 'https://angular.dev/guide/testing' },
    { url: 'https://vitest.dev/guide/' },
    { url: 'https://www.cypress.io/' },
  ],
  'p4-coding': [
    { url: 'https://angular.dev/api/forms/ControlValueAccessor' },
    { url: 'https://angular.dev/guide/http/interceptors' },
    { url: 'https://angular.dev/guide/signals' },
  ],
  'p4-system-design': [
    { url: 'https://web.dev/articles/rail' },
    { url: 'https://martinfowler.com/articles/micro-frontends.html' },
    { url: 'https://12factor.net/' },
  ],
  'p4-question-bank': [
    { url: 'https://angular.dev/roadmap' },
    { url: 'https://rxjs.dev/guide/operators' },
    { url: 'https://www.typescriptlang.org/docs/handbook/2/' },
  ],
  'p4-mock': [
    { url: 'https://www.pramp.com/#/' },
    { url: 'https://interviewing.io/' },
    { url: 'https://www.techinterviewhandbook.org/' },
  ],
};

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
      {
        id: 'js-tree-shaking',
        title: 'Tree shaking and dead code elimination',
        explanation:
          'Tree shaking is a build-time optimization that removes unused exports from the final bundle. It relies on ES module static structure (import/export) so the bundler can determine at compile time which exports are consumed and safely drop the rest.',
        highlights: [
          'Only works with ES modules (static import/export); CommonJS require() defeats it.',
          'Mark packages side-effect-free via "sideEffects" field in package.json so bundlers can prune entire unused modules.',
          'Avoid barrel files that re-export everything — they prevent effective tree shaking because the bundler must assume all re-exports might be used.',
          'Angular CLI leverages Webpack/esbuild tree shaking; providedIn: root services are tree-shakable because unused services are never referenced.',
          'Use named exports and explicit imports instead of namespace imports (import *) to help bundlers identify unused bindings.',
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
export class InterviewPrepPage implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private speechQueue: string[] = [];
  private speechQueueIndex = 0;
  private readonly readFromCurrentStepValue = '__current-step__';
  private readonly readFromCurrentGoalValue = '__current-goal__';
  private readonly readFromStepPrefix = '__step__:';

  protected readonly asOfDate = 'March 24, 2026';
  protected readonly ttsSupported$$ = signal(this.hasSpeechSynthesisSupport());
  protected readonly isReading$$ = signal(false);
  protected readonly selectedSpeechLanguage$$ = signal('en-US');
  protected readonly selectedReadFromSection$$ = signal('');
  protected readonly currentStepId$$ = signal('');
  protected readonly readFromCurrentStepOptionValue = this.readFromCurrentStepValue;
  protected readonly readFromCurrentGoalOptionValue = this.readFromCurrentGoalValue;
  protected readonly speechLanguageOptions: SpeechLanguageOption[] = [
    { value: 'en-US', label: 'English (United States)' },
    { value: 'en-GB', label: 'English (United Kingdom)' },
    { value: 'pl-PL', label: 'Polski (Polska)' },
  ];

  protected readonly knowledgeBlocks$$ = signal<KnowledgeBlock[]>(this.buildInitialKnowledgeBlocks());

  protected readonly sections$$ = signal<PrepSection[]>(this.buildInitialSections());

  protected readonly knowledgeDoneCountById$$ = computed(() => {
    const counts: Record<string, number> = {};
    for (const block of this.knowledgeBlocks$$()) {
      counts[block.id] = block.topics.filter((topic) => topic.done).length;
    }

    return counts;
  });

  protected readonly sectionDoneCountById$$ = computed(() => {
    const counts: Record<string, number> = {};
    for (const section of this.sections$$()) {
      counts[section.id] = section.items.filter((item) => item.done).length;
    }

    return counts;
  });

  protected readonly allPhaseItems$$ = computed(() =>
    this.sections$$().flatMap((section) =>
      section.items.map((item) => ({ sectionTitle: section.title, item }))
    )
  );

  protected readonly allKnowledgeItems$$ = computed(() =>
    this.knowledgeBlocks$$().flatMap((block) =>
      block.topics.map((topic) => ({ sectionTitle: block.title, item: topic }))
    )
  );

  protected readonly allLearningItems$$ = computed(() => [
    ...this.allKnowledgeItems$$(),
    ...this.allPhaseItems$$(),
  ]);

  protected readonly orderedSteps$$ = computed<LearningStep[]>(() => [
    ...this.knowledgeBlocks$$().flatMap((block) =>
      block.topics.map((topic) => ({
        kind: 'knowledge' as const,
        parentId: block.id,
        id: topic.id,
        sectionTitle: block.title,
        title: topic.title,
        explanation: topic.explanation,
        done: topic.done,
        highlights: topic.highlights,
      }))
    ),
    ...this.sections$$().flatMap((section) =>
      section.items.map((item) => ({
        kind: 'phase' as const,
        parentId: section.id,
        id: item.id,
        sectionTitle: `${section.title} (${section.period})`,
        title: item.title,
        explanation: item.explanation,
        done: item.done,
        highlights: [],
      }))
    ),
  ]);

  protected readonly readStartOptions$$ = computed<ReadStartOption[]>(() =>
    this.orderedSteps$$().map((step, index) => ({
      value: `${this.readFromStepPrefix}${step.id}`,
      label: `Step ${index + 1}: ${step.title}`,
    }))
  );

  protected readonly totalCount$$ = computed(() => this.allLearningItems$$().length);

  protected readonly completedCount$$ = computed(
    () => this.allLearningItems$$().filter(({ item }) => item.done).length
  );

  protected readonly percentComplete$$ = computed(() => {
    const total = this.totalCount$$();
    if (total === 0) return 0;

    return Math.round((this.completedCount$$() / total) * 100);
  });

  protected readonly pendingGoals$$ = computed<GoalItem[]>(() =>
    this.orderedSteps$$()
      .map((step, index) => ({ step, stepNumber: index + 1 }))
      .filter(({ step }) => !step.done)
      .map(({ step, stepNumber }) => ({
        stepNumber,
        sectionTitle: step.sectionTitle,
        itemTitle: step.title,
      }))
  );

  protected readonly currentGoal$$ = computed<GoalItem | null>(() => {
    const pendingGoals = this.pendingGoals$$();
    return pendingGoals.length > 0 ? pendingGoals[0] : null;
  });

  protected readonly nextGoal$$ = computed<GoalItem | null>(() => {
    const pendingGoals = this.pendingGoals$$();
    return pendingGoals.length > 1 ? pendingGoals[1] : null;
  });

  protected readonly searchQuery$$ = signal('');

  protected readonly filteredSteps$$ = computed<FilteredStep[]>(() => {
    const steps = this.orderedSteps$$();
    const query = this.searchQuery$$().trim().toLowerCase();

    const withNumbers: FilteredStep[] = steps.map((step, index) => ({
      ...step,
      originalStepNumber: index + 1,
    }));

    if (!query) return withNumbers;

    return withNumbers.filter((step) => {
      if (step.title.toLowerCase().includes(query)) return true;
      if (step.sectionTitle.toLowerCase().includes(query)) return true;
      if (step.explanation.toLowerCase().includes(query)) return true;
      if (step.highlights.some((h) => h.toLowerCase().includes(query))) return true;

      const qas = this.getStepInterviewQas(step);
      return qas.some(
        (qa) =>
          qa.question.toLowerCase().includes(query) ||
          qa.answer.toLowerCase().includes(query)
      );
    });
  });

  protected setSearchQuery(query: string): void {
    this.searchQuery$$.set(query);
  }

  protected highlightText(text: string): string {
    const query = this.searchQuery$$().trim();
    if (!query) return text;
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(
      new RegExp(`(${queryEscaped})`, 'gi'),
      '<mark class="prep__highlight">$1</mark>'
    );
  }

  private readonly persistProgress = effect(() => {
    const doneIds = this.allPhaseItems$$()
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

  protected resetAllProgress(): void {
    this.resetKnowledgeProgress();
    this.sections$$.update((sections) =>
      sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, done: false })),
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

  protected setStepDone(step: LearningStep, done: boolean): void {
    if (step.kind === 'knowledge') {
      this.setKnowledgeTopicDone(step.parentId, step.id, done);
      return;
    }

    this.setItemDone(step.parentId, step.id, done);
  }

  protected getStepSources(step: LearningStep): SourceLink[] {
    return STEP_SOURCES[step.id] ?? [];
  }

  protected getStepInterviewQas(step: LearningStep): InterviewQa[] {
    return SECTION_INTERVIEW_QA[`${step.kind}:${step.parentId}`] ?? [];
  }

  protected toggleReadAllSections(): void {
    if (!this.ttsSupported$$()) return;

    if (this.isReading$$()) {
      this.stopReading();
      return;
    }

    this.startReadingAllSections();
  }

  protected setReadStartSelection(selection: string): void {
    this.selectedReadFromSection$$.set(selection);
  }

  protected setSpeechLanguage(languageCode: string): void {
    this.selectedSpeechLanguage$$.set(languageCode);
  }

  protected setCurrentStep(stepId: string): void {
    this.currentStepId$$.set(stepId);
  }

  protected onStepToggle(stepId: string, isOpen: boolean): void {
    if (isOpen) {
      this.currentStepId$$.set(stepId);
    }
  }

  protected stopReading(): void {
    const synth = this.getSpeechSynthesis();
    synth?.cancel();
    this.isReading$$.set(false);
    this.speechQueue = [];
    this.speechQueueIndex = 0;
  }

  ngOnDestroy(): void {
    this.stopReading();
  }

  private startReadingAllSections(): void {
    const synth = this.getSpeechSynthesis();
    if (!synth) return;

    const queue = this.buildNarrationQueue(this.selectedReadFromSection$$());
    if (queue.length === 0) return;

    synth.cancel();
    this.speechQueue = queue;
    this.speechQueueIndex = 0;
    this.isReading$$.set(true);
    this.speakNextInQueue();
  }

  private speakNextInQueue(): void {
    const synth = this.getSpeechSynthesis();
    if (!synth || !this.isReading$$()) {
      this.isReading$$.set(false);
      return;
    }

    const nextText = this.speechQueue[this.speechQueueIndex];
    if (!nextText) {
      this.isReading$$.set(false);
      this.speechQueue = [];
      this.speechQueueIndex = 0;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(nextText);
    const selectedLanguage = this.selectedSpeechLanguage$$();
    utterance.lang = selectedLanguage;
    const matchingVoice = this.findBestVoiceForLanguage(synth, selectedLanguage);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      this.speechQueueIndex += 1;
      this.speakNextInQueue();
    };
    utterance.onerror = () => {
      this.speechQueueIndex += 1;
      this.speakNextInQueue();
    };

    synth.speak(utterance);
  }

  private buildNarrationQueue(startSelection: string): string[] {
    const indexedSteps = this.orderedSteps$$().map((step, index) => ({ step, index }));
    const startFromCurrentStep = startSelection === this.readFromCurrentStepValue;
    const startFromCurrentGoal = startSelection === this.readFromCurrentGoalValue;
    const startFromSpecificStep = startSelection.startsWith(this.readFromStepPrefix);
    const selectedStepId = startFromSpecificStep
      ? startSelection.slice(this.readFromStepPrefix.length)
      : '';

    const startIndex = startFromCurrentStep
      ? this.getCurrentStepStartIndex(indexedSteps)
      : startFromCurrentGoal
        ? this.getCurrentGoalStartIndex(indexedSteps)
        : selectedStepId
          ? indexedSteps.findIndex(({ step }) => step.id === selectedStepId)
          : 0;

    const queueSource = startIndex >= 0 ? indexedSteps.slice(startIndex) : indexedSteps;

    return queueSource.map(({ step, index }) => {
      const generalLearningPointsText =
        step.highlights.length > 0 ? ` Key learning points: ${step.highlights.join(' ')}` : '';
      const interviewQas = this.getStepInterviewQas(step);
      const interviewQuestionText =
        interviewQas.length > 0
          ? ` Interview questions and model answers: ${interviewQas
              .map(
                (qa, qaIndex) =>
                  `Question ${qaIndex + 1}: ${qa.question} Answer ${qaIndex + 1}: ${qa.answer}`
              )
              .join(' ')}`
          : '';

      return `Step ${index + 1}. ${step.title}. Section: ${step.sectionTitle}. General learning information: ${step.explanation}.${generalLearningPointsText}${interviewQuestionText}`;
    });
  }

  private getCurrentStepStartIndex(
    indexedSteps: Array<{ step: LearningStep; index: number }>
  ): number {
    const currentStepId = this.currentStepId$$();
    if (!currentStepId) return 0;

    const currentIndex = indexedSteps.findIndex(({ step }) => step.id === currentStepId);
    return currentIndex >= 0 ? currentIndex : 0;
  }

  private getCurrentGoalStartIndex(
    indexedSteps: Array<{ step: LearningStep; index: number }>
  ): number {
    const firstUndoneIndex = indexedSteps.findIndex(({ step }) => !step.done);
    return firstUndoneIndex >= 0 ? firstUndoneIndex : 0;
  }

  private hasSpeechSynthesisSupport(): boolean {
    return !!this.getSpeechSynthesis();
  }

  private findBestVoiceForLanguage(
    synth: SpeechSynthesis,
    languageCode: string
  ): SpeechSynthesisVoice | null {
    const voices = synth.getVoices();
    if (!voices.length) return null;

    const exactVoice = voices.find((voice) => voice.lang === languageCode);
    if (exactVoice) return exactVoice;

    const languagePrefix = languageCode.split('-')[0];
    const sameLanguageVoice = voices.find((voice) => voice.lang.startsWith(`${languagePrefix}-`));
    return sameLanguageVoice ?? null;
  }

  private getSpeechSynthesis(): SpeechSynthesis | null {
    try {
      return this.document.defaultView?.speechSynthesis ?? null;
    } catch {
      return null;
    }
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
