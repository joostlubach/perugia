import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

// Looks up a question's wording in question-texts.yaml.
export function texts(key: string): { title: string; text: string; playerText: string } {
  const entry = QUESTION_TEXTS[key];
  if (!entry) throw new Error(`No texts for question "${key}" in question-texts.yaml`);
  return { title: entry.title, text: entry.host, playerText: entry.player };
}

interface QuestionTexts {
  title: string;
  host: string;
  player: string;
}

const QUESTION_TEXTS: Record<string, QuestionTexts> = parse(
  readFileSync(join(__dirname, 'question-texts.yaml'), 'utf8'),
);
