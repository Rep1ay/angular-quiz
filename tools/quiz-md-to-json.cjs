/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_MD = path.join(ROOT, 'quiz-content.md');
const OUTPUT_JSON = path.join(ROOT, 'public', 'quiz-questions.json');

const QUESTION_HEADER = /^\s*(\d+)\.\s+###\s+(.*)\s*$/;
const BACK_TO_TOP = /\[⬆\s*Back\s*to\s*Top\]/i;

function parseQuizContentMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const entries = [];

  let current = null;

  const flush = () => {
    if (!current) return;

    const explanationMarkdown = current.explanation.join('\n').replace(/\s+$/g, '').trim();

    if (!current.question.trim()) {
      current = null;
      return;
    }

    if (!explanationMarkdown) {
      current = null;
      return;
    }

    entries.push({
      id: current.id,
      question: current.question.trim(),
      explanationMarkdown,
    });

    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine ?? '';

    const headerMatch = line.match(QUESTION_HEADER);
    if (headerMatch) {
      flush();
      const number = headerMatch[1];
      const question = headerMatch[2];
      current = { id: `q${number}`, question, explanation: [] };
      continue;
    }

    if (!current) continue;

    if (BACK_TO_TOP.test(line)) {
      flush();
      continue;
    }

    current.explanation.push(line);
  }

  flush();

  return entries;
}

function markdownToPlainText(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\r/g, '')
    .trim();
}

function firstSentence(markdown) {
  const text = markdownToPlainText(markdown);
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const idx = cleaned.search(/[.!?]\s/);
  if (idx === -1) return cleaned.slice(0, 140);

  return cleaned.slice(0, idx + 1).slice(0, 160);
}

function seededShuffle(items, seed) {
  const copy = [...items];
  let x = seed | 0;

  const rand = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function buildMultipleChoiceQuestions(entries) {
  const summaries = entries.map((e) => firstSentence(e.explanationMarkdown));

  const takeSummary = (index) => summaries[index] || firstSentence(entries[index]?.explanationMarkdown ?? '');

  return entries
    .filter((e) => e.question.trim().length > 0)
    .map((entry, index) => {
      const correct = takeSummary(index) || 'See explanation';
      const n = entries.length;

      const distractorIndexes = n >= 4
        ? [1, 2, 3].map((offset) => (index + offset) % n)
        : Array.from({ length: Math.max(0, n - 1) }, (_, i) => (index + i + 1) % n);

      const optionsRaw = [
        { kind: 'correct', label: correct },
        ...distractorIndexes.map((i) => ({ kind: 'distractor', label: takeSummary(i) || 'See explanation' })),
      ].filter((o) => o.label.trim().length > 0);

      const optionsDeduped = [];
      const seen = new Set();
      for (const opt of optionsRaw) {
        const key = opt.label.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        optionsDeduped.push(opt);
        if (optionsDeduped.length >= 4) break;
      }

      const shuffled = seededShuffle(optionsDeduped, index + 1);
      const options = shuffled.map((o, i) => ({ id: String(i), label: o.label }));
      const correctIndex = shuffled.findIndex((o) => o.kind === 'correct');

      return {
        id: entry.id,
        question: entry.question,
        options,
        correctOptionId: options[correctIndex]?.id ?? '0',
        explanationMarkdown: entry.explanationMarkdown,
      };
    });
}

function main() {
  const markdown = fs.readFileSync(INPUT_MD, 'utf8');
  const entries = parseQuizContentMarkdown(markdown);
  const questions = buildMultipleChoiceQuestions(entries);

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ questions }, null, 2) + '\n', 'utf8');

  console.log(`Generated ${questions.length} questions -> ${path.relative(ROOT, OUTPUT_JSON)}`);
}

main();
