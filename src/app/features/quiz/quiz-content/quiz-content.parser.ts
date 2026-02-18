export interface ParsedQuizEntry {
  id: string;
  question: string;
  explanationMarkdown: string;
}

const QUESTION_HEADER = /^\s*(\d+)\.\s+###\s+(.*)\s*$/;
const BACK_TO_TOP = /\[⬆\s*Back\s*to\s*Top\]/i;

export function parseQuizContentMarkdown(markdown: string): ParsedQuizEntry[] {
  const lines = markdown.split(/\r?\n/);
  const entries: ParsedQuizEntry[] = [];

  let current: { id: string; question: string; explanation: string[] } | null = null;

  const flush = () => {
    if (!current) return;

    const explanationMarkdown = current.explanation
      .join('\n')
      .replace(/\s+$/g, '')
      .trim();

    if (current.question.trim().length === 0) {
      current = null;
      return;
    }

    if (explanationMarkdown.length === 0) {
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

export function markdownToPlainText(markdown: string): string {
  // Intentionally lightweight: remove some common markdown noise for short summaries.
  return markdown
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

export function firstSentence(markdown: string): string {
  const text = markdownToPlainText(markdown);
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const idx = cleaned.search(/[.!?]\s/);
  if (idx === -1) return cleaned.slice(0, 140);

  return cleaned.slice(0, idx + 1).slice(0, 160);
}
